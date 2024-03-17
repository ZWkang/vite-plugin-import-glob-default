<script lang="ts" setup>
import { defineEmits, defineProps, toRefs } from 'vue';

interface IProps {}

const props = defineProps<IProps>();

const {} = toRefs(props);
</script>

<template>
  <div>
    <slot />
  </div>
</template>

<style lang="scss" scoped></style>
