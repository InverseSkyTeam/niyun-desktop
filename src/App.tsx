import { MainWindow } from "./windows/MainWindow";
import { PetWindow } from "./windows/PetWindow";


const isPetView =
    new URLSearchParams(window.location.search).get("view") === "pet";

export default function App() {
    return isPetView ? <PetWindow /> : <MainWindow />;
}
