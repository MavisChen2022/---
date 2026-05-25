using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpClient();
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.Cookie.Name = "avatarmail.session";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    options.IdleTimeout = TimeSpan.FromHours(8);
});

var frontendOrigin = builder.Configuration["Frontend:Origin"] ?? "http://localhost:5173";
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(frontendOrigin)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

app.UseCors("Frontend");
app.UseSession();

app.MapGet("/", () => Results.Ok(new { name = "AvatarMail.Api", status = "ok" }));

app.MapGet("/api/auth/status", (HttpContext ctx) =>
{
    var email = ctx.Session.GetString(SessionKeys.Email);
    var accessToken = ctx.Session.GetString(SessionKeys.AccessToken);
    var expiresAt = ctx.Session.GetString(SessionKeys.ExpiresAt);
    var connected = !string.IsNullOrWhiteSpace(accessToken) && !IsExpired(expiresAt);

    return Results.Ok(new AuthStatusResponse(
        Connected: connected,
        Email: connected ? email : null,
        Status: connected ? "ok" : "auth_error"
    ));
});

app.MapGet("/api/auth/login", (HttpContext ctx, IConfiguration config) =>
{
    var oauth = GoogleOAuthOptions.FromConfiguration(config);
    if (!oauth.IsConfigured)
    {
        return Results.Problem("Google OAuth is not configured.", statusCode: StatusCodes.Status500InternalServerError);
    }

    var state = Guid.NewGuid().ToString("N");
    ctx.Session.SetString(SessionKeys.OAuthState, state);

    var query = new Dictionary<string, string?>
    {
        ["client_id"] = oauth.ClientId,
        ["redirect_uri"] = oauth.RedirectUri,
        ["response_type"] = "code",
        ["scope"] = GmailScopes.Readonly,
        ["state"] = state,
        ["access_type"] = "offline",
        ["prompt"] = "consent"
    };

    var url = "https://accounts.google.com/o/oauth2/v2/auth?" + BuildQuery(query);
    return Results.Redirect(url);
});

app.MapGet("/api/auth/callback", async (
    HttpContext ctx,
    IConfiguration config,
    IHttpClientFactory httpClientFactory,
    string? code,
    string? state,
    string? error) =>
{
    if (!string.IsNullOrWhiteSpace(error))
    {
        return RedirectToFrontend(config, $"?oauth_error={WebUtility.UrlEncode(error)}");
    }

    var expectedState = ctx.Session.GetString(SessionKeys.OAuthState);
    if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(state) || state != expectedState)
    {
        return RedirectToFrontend(config, "?oauth_error=invalid_state");
    }

    var oauth = GoogleOAuthOptions.FromConfiguration(config);
    if (!oauth.IsConfigured)
    {
        return RedirectToFrontend(config, "?oauth_error=server_oauth_not_configured");
    }

    var client = httpClientFactory.CreateClient();
    var tokenResponse = await ExchangeCodeForTokenAsync(client, oauth, code);
    if (tokenResponse is null || string.IsNullOrWhiteSpace(tokenResponse.AccessToken))
    {
        return RedirectToFrontend(config, "?oauth_error=token_exchange_failed");
    }

    var profile = await FetchGmailProfileAsync(client, tokenResponse.AccessToken);
    if (profile is null || string.IsNullOrWhiteSpace(profile.EmailAddress))
    {
        return RedirectToFrontend(config, "?oauth_error=profile_fetch_failed");
    }

    StoreTokens(ctx.Session, tokenResponse);
    ctx.Session.SetString(SessionKeys.Email, profile.EmailAddress);
    ctx.Session.Remove(SessionKeys.OAuthState);

    return RedirectToFrontend(config);
});

app.MapPost("/api/auth/logout", (HttpContext ctx) =>
{
    ctx.Session.Clear();
    return Results.Ok(new { connected = false });
});

app.MapGet("/api/gmail/inbox", async (
    HttpContext ctx,
    IConfiguration config,
    IHttpClientFactory httpClientFactory) =>
{
    var client = httpClientFactory.CreateClient();
    var accessToken = await GetValidAccessTokenAsync(ctx.Session, config, client);
    if (accessToken is null)
    {
        return Results.Json(
            new InboxSyncResponse(0, Array.Empty<InboxMessageSummary>(), DateTimeOffset.UtcNow, "auth_error"),
            statusCode: StatusCodes.Status401Unauthorized);
    }

    try
    {
        var unreadCount = await FetchInboxUnreadCountAsync(client, accessToken);
        return Results.Ok(new InboxSyncResponse(unreadCount, Array.Empty<InboxMessageSummary>(), DateTimeOffset.UtcNow, "ok"));
    }
    catch (GmailHttpException ex) when (ex.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
    {
        return Results.Json(
            new InboxSyncResponse(0, Array.Empty<InboxMessageSummary>(), DateTimeOffset.UtcNow, "auth_error"),
            statusCode: StatusCodes.Status401Unauthorized);
    }
    catch
    {
        return Results.Json(
            new InboxSyncResponse(0, Array.Empty<InboxMessageSummary>(), DateTimeOffset.UtcNow, "offline"),
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }
});

app.MapGet("/api/modules", (IConfiguration config, IWebHostEnvironment env) =>
{
    var root = ResolveModulesRoot(config, env);
    var ids = ReadModuleIds(root);
    var modules = ids.Select(id => LoadModule(root, id)).Where(module => module is not null).ToArray();
    return Results.Ok(modules);
});

app.MapGet("/api/modules/{id}/manifest", (IConfiguration config, IWebHostEnvironment env, string id) =>
{
    var root = ResolveModulesRoot(config, env);
    var manifestPath = Path.Combine(root, id, "manifest.json");
    if (!System.IO.File.Exists(manifestPath)) return Results.NotFound();
    return Results.File(manifestPath, "application/json");
});

app.MapGet("/api/modules/{id}/assets/{**assetPath}", (
    IConfiguration config,
    IWebHostEnvironment env,
    string id,
    string assetPath) =>
{
    var root = ResolveModulesRoot(config, env);
    var moduleRoot = Path.GetFullPath(Path.Combine(root, id));
    var filePath = Path.GetFullPath(Path.Combine(moduleRoot, assetPath));

    if (!filePath.StartsWith(moduleRoot, StringComparison.OrdinalIgnoreCase) || !System.IO.File.Exists(filePath))
    {
        return Results.NotFound();
    }

    return Results.File(filePath, GetContentType(filePath));
});

app.Run();

static string BuildQuery(Dictionary<string, string?> values)
{
    return string.Join("&", values
        .Where(pair => pair.Value is not null)
        .Select(pair => $"{WebUtility.UrlEncode(pair.Key)}={WebUtility.UrlEncode(pair.Value)}"));
}

static IResult RedirectToFrontend(IConfiguration config, string suffix = "")
{
    var origin = config["Frontend:Origin"] ?? "http://localhost:5173";
    return Results.Redirect(origin.TrimEnd('/') + "/" + suffix);
}

static async Task<GoogleTokenResponse?> ExchangeCodeForTokenAsync(HttpClient client, GoogleOAuthOptions oauth, string code)
{
    var body = new Dictionary<string, string>
    {
        ["client_id"] = oauth.ClientId,
        ["client_secret"] = oauth.ClientSecret,
        ["code"] = code,
        ["grant_type"] = "authorization_code",
        ["redirect_uri"] = oauth.RedirectUri
    };

    using var response = await client.PostAsync("https://oauth2.googleapis.com/token", new FormUrlEncodedContent(body));
    if (!response.IsSuccessStatusCode) return null;
    return await response.Content.ReadFromJsonAsync<GoogleTokenResponse>(JsonOptions.Default);
}

static void StoreTokens(ISession session, GoogleTokenResponse token)
{
    session.SetString(SessionKeys.AccessToken, token.AccessToken);
    if (!string.IsNullOrWhiteSpace(token.RefreshToken))
    {
        session.SetString(SessionKeys.RefreshToken, token.RefreshToken);
    }

    var expiresAt = DateTimeOffset.UtcNow.AddSeconds(Math.Max(60, token.ExpiresIn - 60));
    session.SetString(SessionKeys.ExpiresAt, expiresAt.ToUnixTimeSeconds().ToString());
}

static bool IsExpired(string? expiresAtRaw)
{
    if (!long.TryParse(expiresAtRaw, out var expiresAt)) return true;
    return DateTimeOffset.UtcNow.ToUnixTimeSeconds() >= expiresAt;
}

static async Task<string?> GetValidAccessTokenAsync(ISession session, IConfiguration config, HttpClient client)
{
    var accessToken = session.GetString(SessionKeys.AccessToken);
    if (!string.IsNullOrWhiteSpace(accessToken) && !IsExpired(session.GetString(SessionKeys.ExpiresAt)))
    {
        return accessToken;
    }

    var refreshToken = session.GetString(SessionKeys.RefreshToken);
    if (string.IsNullOrWhiteSpace(refreshToken)) return null;

    var oauth = GoogleOAuthOptions.FromConfiguration(config);
    if (!oauth.IsConfigured) return null;

    var body = new Dictionary<string, string>
    {
        ["client_id"] = oauth.ClientId,
        ["client_secret"] = oauth.ClientSecret,
        ["refresh_token"] = refreshToken,
        ["grant_type"] = "refresh_token"
    };

    using var response = await client.PostAsync("https://oauth2.googleapis.com/token", new FormUrlEncodedContent(body));
    if (!response.IsSuccessStatusCode) return null;

    var token = await response.Content.ReadFromJsonAsync<GoogleTokenResponse>(JsonOptions.Default);
    if (token is null || string.IsNullOrWhiteSpace(token.AccessToken)) return null;

    StoreTokens(session, token);
    if (string.IsNullOrWhiteSpace(token.RefreshToken))
    {
        session.SetString(SessionKeys.RefreshToken, refreshToken);
    }
    return token.AccessToken;
}

static async Task<GmailProfile?> FetchGmailProfileAsync(HttpClient client, string accessToken)
{
    using var request = CreateGmailRequest(HttpMethod.Get, "https://gmail.googleapis.com/gmail/v1/users/me/profile", accessToken);
    using var response = await client.SendAsync(request);
    if (!response.IsSuccessStatusCode) return null;
    return await response.Content.ReadFromJsonAsync<GmailProfile>(JsonOptions.Default);
}

static async Task<int> FetchInboxUnreadCountAsync(HttpClient client, string accessToken)
{
    using var request = CreateGmailRequest(HttpMethod.Get, "https://gmail.googleapis.com/gmail/v1/users/me/labels/INBOX", accessToken);
    using var response = await client.SendAsync(request);
    if (!response.IsSuccessStatusCode) throw new GmailHttpException(response.StatusCode);

    var label = await response.Content.ReadFromJsonAsync<InboxLabelResponse>(JsonOptions.Default);
    return Math.Max(0, label?.MessagesUnread ?? 0);
}

static HttpRequestMessage CreateGmailRequest(HttpMethod method, string url, string accessToken)
{
    var request = new HttpRequestMessage(method, url);
    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
    return request;
}

static string ResolveModulesRoot(IConfiguration config, IWebHostEnvironment env)
{
    var configured = config["Modules:RootPath"];
    if (!string.IsNullOrWhiteSpace(configured))
    {
        return Path.GetFullPath(Path.IsPathRooted(configured) ? configured : Path.Combine(env.ContentRootPath, configured));
    }

    return Path.GetFullPath(Path.Combine(env.ContentRootPath, "..", "..", "public", "modules"));
}

static string[] ReadModuleIds(string root)
{
    var indexPath = Path.Combine(root, "index.json");
    if (System.IO.File.Exists(indexPath))
    {
        var ids = JsonSerializer.Deserialize<string[]>(System.IO.File.ReadAllText(indexPath), JsonOptions.Default);
        if (ids is not null) return ids;
    }

    return Directory.Exists(root)
        ? Directory.GetDirectories(root).Select(Path.GetFileName).Where(name => !string.IsNullOrWhiteSpace(name)).Cast<string>().ToArray()
        : Array.Empty<string>();
}

static ModuleResponse? LoadModule(string root, string id)
{
    var manifestPath = Path.Combine(root, id, "manifest.json");
    if (!System.IO.File.Exists(manifestPath)) return null;

    try
    {
        var manifestJson = System.IO.File.ReadAllText(manifestPath);
        var manifest = JsonSerializer.Deserialize<JsonElement>(manifestJson, JsonOptions.Default);
        return new ModuleResponse(
            Id: id,
            Manifest: manifest,
            BaseUrl: $"/api/modules/{Uri.EscapeDataString(id)}/assets/",
            Enabled: true,
            ValidationStatus: "valid",
            ValidationErrors: Array.Empty<string>());
    }
    catch (Exception ex)
    {
        return new ModuleResponse(
            Id: id,
            Manifest: JsonSerializer.Deserialize<JsonElement>("{}"),
            BaseUrl: $"/api/modules/{Uri.EscapeDataString(id)}/assets/",
            Enabled: false,
            ValidationStatus: "invalid",
            ValidationErrors: new[] { ex.Message });
    }
}

static string GetContentType(string filePath)
{
    return Path.GetExtension(filePath).ToLowerInvariant() switch
    {
        ".json" => "application/json",
        ".mjs" => "text/javascript",
        ".js" => "text/javascript",
        ".webp" => "image/webp",
        ".png" => "image/png",
        ".apng" => "image/apng",
        ".svg" => "image/svg+xml",
        _ => "application/octet-stream"
    };
}

static class GmailScopes
{
    public const string Readonly = "https://www.googleapis.com/auth/gmail.readonly";
}

static class SessionKeys
{
    public const string OAuthState = "oauth_state";
    public const string AccessToken = "google_access_token";
    public const string RefreshToken = "google_refresh_token";
    public const string ExpiresAt = "google_expires_at";
    public const string Email = "gmail_email";
}

static class JsonOptions
{
    public static readonly JsonSerializerOptions Default = new(JsonSerializerDefaults.Web);
}

sealed record GoogleOAuthOptions(string ClientId, string ClientSecret, string RedirectUri)
{
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(ClientId) &&
        !string.IsNullOrWhiteSpace(ClientSecret) &&
        !string.IsNullOrWhiteSpace(RedirectUri);

    public static GoogleOAuthOptions FromConfiguration(IConfiguration config) =>
        new(
            config["GoogleOAuth:ClientId"] ?? "",
            config["GoogleOAuth:ClientSecret"] ?? "",
            config["GoogleOAuth:RedirectUri"] ?? "http://localhost:5080/api/auth/callback");
}

sealed record AuthStatusResponse(bool Connected, string? Email, string Status);
sealed record InboxSyncResponse(int UnreadCount, InboxMessageSummary[] Messages, DateTimeOffset SyncedAt, string Status);
sealed record InboxMessageSummary();
sealed record ModuleResponse(string Id, JsonElement Manifest, string BaseUrl, bool Enabled, string ValidationStatus, string[] ValidationErrors);

sealed record GoogleTokenResponse(
    [property: JsonPropertyName("access_token")] string AccessToken,
    [property: JsonPropertyName("expires_in")] int ExpiresIn,
    [property: JsonPropertyName("token_type")] string TokenType,
    [property: JsonPropertyName("refresh_token")] string? RefreshToken);

sealed record GmailProfile(string EmailAddress);
sealed record InboxLabelResponse(string Id, int MessagesUnread);

sealed class GmailHttpException : Exception
{
    public GmailHttpException(HttpStatusCode statusCode) : base($"Gmail API failed with {statusCode}")
    {
        StatusCode = statusCode;
    }

    public HttpStatusCode StatusCode { get; }
}
