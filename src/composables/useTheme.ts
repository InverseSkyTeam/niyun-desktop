import { ref } from "vue";

export function useTheme() {
    const theme = ref<"light" | "dark">("light");

    function applyTheme() {
        document.documentElement.classList.toggle(
            "dark",
            theme.value === "dark",
        );
    }

    function toggleTheme() {
        theme.value = theme.value === "dark" ? "light" : "dark";
        localStorage.setItem("pet-theme", theme.value);
        applyTheme();
    }

    function setTheme(t: "light" | "dark") {
        theme.value = t;
        localStorage.setItem("pet-theme", theme.value);
        applyTheme();
    }

    function loadTheme() {
        const stored = localStorage.getItem(
            "pet-theme",
        ) as "light" | "dark" | null;
        if (stored) theme.value = stored;
        applyTheme();
    }

    return { theme, toggleTheme, setTheme, loadTheme };
}
