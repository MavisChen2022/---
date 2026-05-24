<script setup lang="ts">
import { computed, ref } from "vue";
import {
  AVATAR_STATES,
  type AvatarState,
  type StateThresholds,
} from "@/core/avatar/types";
import { STATE_LABELS } from "@/core/avatar/threshold-format";
import { resolveState } from "@/core/avatar/state-engine";
import { validateThresholds } from "@/core/avatar/threshold-validator";

const props = defineProps<{
  modelValue: StateThresholds;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: StateThresholds];
}>();

const testUnread = ref(0);

const local = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const validation = computed(() => validateThresholds(local.value));
const previewState = computed(() => resolveState(testUnread.value, local.value));

function updateState(
  state: AvatarState,
  field: "min" | "max",
  value: number | null,
) {
  const next = { ...local.value };
  next[state] = { ...next[state], [field]: value };
  if (state === "panic" && field === "max" && value === null) {
    next.panic = { ...next.panic, max: null };
  }
  local.value = next;
}

function onMaxInput(state: AvatarState, raw: string) {
  if (raw.trim() === "" || raw === "∞") {
    if (state === "panic") updateState(state, "max", null);
    return;
  }
  const n = parseInt(raw, 10);
  if (!Number.isNaN(n)) updateState(state, "max", n);
}

function setPanicUnlimited(unlimited: boolean) {
  updateState("panic", "max", unlimited ? null : Math.max(local.value.panic.min, 21));
}

</script>

<template>
  <div class="threshold-editor">
    <table class="threshold-table">
      <thead>
        <tr>
          <th>狀態</th>
          <th>最小未讀</th>
          <th>最大未讀</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="state in AVATAR_STATES" :key="state">
          <td>{{ STATE_LABELS[state] }}</td>
          <td>
            <input
              type="number"
              min="0"
              step="1"
              :value="local[state].min"
              @input="
                updateState(
                  state,
                  'min',
                  parseInt(($event.target as HTMLInputElement).value, 10) || 0,
                )
              "
            />
          </td>
          <td>
            <template v-if="state === 'panic'">
              <label class="unlimited">
                <input
                  type="checkbox"
                  :checked="local.panic.max === null"
                  @change="setPanicUnlimited(($event.target as HTMLInputElement).checked)"
                />
                無上限
              </label>
              <input
                v-if="local.panic.max !== null"
                type="number"
                min="0"
                step="1"
                :value="local.panic.max"
                @input="onMaxInput(state, ($event.target as HTMLInputElement).value)"
              />
              <span v-else class="infinity">∞</span>
            </template>
            <input
              v-else
              type="number"
              min="0"
              step="1"
              :value="local[state].max ?? ''"
              @input="onMaxInput(state, ($event.target as HTMLInputElement).value)"
            />
          </td>
        </tr>
      </tbody>
    </table>

    <ul v-if="!validation.valid" class="errors">
      <li v-for="(err, i) in validation.errors" :key="i">{{ err }}</li>
    </ul>

    <div class="preview-box">
      <h3>即時預覽</h3>
      <label>
        測試未讀數
        <input v-model.number="testUnread" type="number" min="0" max="999" step="1" />
      </label>
      <p>
        測試未讀 <strong>{{ testUnread }}</strong> 封 → 狀態
        <strong>{{ previewState }}</strong>
      </p>
    </div>
  </div>
</template>

<style scoped>
.threshold-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}
.threshold-table th,
.threshold-table td {
  padding: 0.5rem;
  text-align: left;
  border-bottom: 1px solid #2d2d44;
}
.threshold-table input[type="number"] {
  width: 4.5rem;
  padding: 0.25rem;
  border-radius: 4px;
  border: 1px solid #3d3d55;
  background: #16162a;
  color: inherit;
}
.unlimited {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-right: 0.5rem;
  font-size: 0.8rem;
}
.infinity {
  font-size: 1.25rem;
}
.errors {
  color: #ff8a8a;
  font-size: 0.8rem;
  margin: 0 0 0.75rem;
  padding-left: 1.25rem;
}
.preview-box {
  background: #16162a;
  border-radius: 8px;
  padding: 0.75rem;
}
.preview-box h3 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
}
.preview-box label {
  display: block;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}
.preview-box input[type="number"] {
  width: 5rem;
  margin-left: 0.5rem;
}
</style>
