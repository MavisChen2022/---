<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useGmailStore } from "@/stores/gmail";
import GmailConnectCard from "@/components/GmailConnectCard.vue";

const gmail = useGmailStore();

const list = computed(() => gmail.messages);

function formatDate(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString();
}

onMounted(async () => {
  if (!gmail.bootstrapped) await gmail.bootstrap();
  await gmail.loadCachedMessages();
});
</script>

<template>
  <section class="card">
    <h2>訊息列表</h2>
    <p class="hint">INBOX 未讀摘要（最多 20 筆，不含正文）</p>

    <GmailConnectCard />

    <ul v-if="list.length" class="message-list">
      <li v-for="msg in list" :key="msg.id" class="message-item">
        <p class="subject">{{ msg.subject }}</p>
        <p class="from">{{ msg.from }}</p>
        <p class="snippet">{{ msg.snippet }}</p>
        <time class="date">{{ formatDate(msg.internalDate) }}</time>
      </li>
    </ul>

    <p v-else-if="gmail.connected" class="empty">目前沒有未讀郵件</p>
    <p v-else class="empty">連線 Gmail 後顯示未讀摘要</p>
  </section>
</template>

<style scoped>
.hint {
  color: #a0a0b8;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}
.message-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.message-item {
  padding: 0.75rem 0;
  border-bottom: 1px solid #2d2d44;
}
.subject {
  margin: 0 0 0.25rem;
  font-weight: 600;
  font-size: 0.9rem;
}
.from {
  margin: 0 0 0.25rem;
  font-size: 0.8rem;
  color: #a0a0b8;
}
.snippet {
  margin: 0 0 0.25rem;
  font-size: 0.8rem;
  color: #c8c8e0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.date {
  font-size: 0.7rem;
  color: #707090;
}
.empty {
  color: #a0a0b8;
  font-size: 0.875rem;
}
</style>
