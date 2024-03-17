const routers = [
  {
    name: 'zwkang',
    component: import.meta.globDefault('./a.vue'),
  }
]

const aVue = import.meta.globDefault('./a.vue')


console.log(routers);
