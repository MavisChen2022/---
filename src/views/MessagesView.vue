<script setup lang="ts">
import { onMounted } from "vue";
import { useGmailStore } from "@/stores/gmail";
import GmailConnectCard from "@/components/GmailConnectCard.vue";

const gmail = useGmailStore();

onMounted(async () => {
  if (!gmail.bootstrapped) await gmail.bootstrap();
});
</script>

<template>
  <section class="card">
    <h2>Gmail 隱私設定</h2>
    <p class="hint">
      目前只讀取 INBOX 未讀數量，不讀取未讀信件清單、主旨、寄件者、摘要或正文。
    </p>

    <GmailConnectCard />

    <p v-if="gmail.connected" class="empty">
      已連線。App 只會使用 Gmail INBOX 的未讀總數來更新 Avatar 狀態。
    </p>
    <p v-else class="empty">連線 Gmail 後只會同步未讀總數。</p>
  </section>
</template>

<style scoped>
.hint {
  color: #a0a0b8;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}
.empty {
  color: #a0a0b8;
  font-size: 0.875rem;
}
</style>
