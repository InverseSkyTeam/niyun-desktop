import { useEffect, useRef, useState } from "react";


export function useTypewriter(speedMs = 28) {
    const [text, setText] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
    const targetRef = useRef("");

    function stop() {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = undefined;
        }
        setIsTyping(false);
    }

    function start(fullText: string) {
        stop();
        targetRef.current = fullText;
        setText("");
        setIsTyping(true);
        let i = 0;
        timerRef.current = setInterval(() => {
            i++;
            if (i >= fullText.length) {
                stop();
            }
            setText(fullText.slice(0, i));
        }, speedMs);
    }

    
    function complete() {
        stop();
        setText(targetRef.current);
    }

    useEffect(() => () => stop(), []);

    return { text, isTyping, start, complete, stop };
}
