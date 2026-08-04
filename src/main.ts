import "./styles.css";

import { createApp } from "vue";
import App from "./App.vue";

createApp(App).mount("#app");

window.addEventListener("load", () => {
    setTimeout(() => {
        const style = document.createElement("style");
        style.textContent = `@font-face {
    font-family: "MapleMonoCN";
    src: url("/font.ttf") format("truetype");
    font-display: swap;
}`;
        document.head.appendChild(style);
    }, 0);
});
