import { createApp } from 'vue'
import { createPinia } from 'pinia'
import timeago from 'vue-timeago3';
import App from './App.vue'
import router from './router'
import "./index.css"

// Register Swiper custom elements globally
import { register } from 'swiper/element/bundle'
register()
const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(timeago)
app.mount('#app')