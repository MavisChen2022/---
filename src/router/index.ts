import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "dashboard", component: () => import("@/views/DashboardView.vue") },
    { path: "/modules", name: "modules", component: () => import("@/views/ModulesView.vue") },
    { path: "/messages", name: "messages", component: () => import("@/views/MessagesView.vue") },
    { path: "/settings", name: "settings", component: () => import("@/views/SettingsView.vue") },
  ],
});

export default router;
