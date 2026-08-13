interface SpeechBubbleProps {
    text: string;
    visible: boolean;
    onClose: () => void;
}

export function SpeechBubble({ text, visible, onClose }: SpeechBubbleProps) {
    if (!visible || !text) return null;
    return (
        <div className="pet-speech" onMouseDown={(e) => e.stopPropagation()} onClick={onClose}>
            <span className="speech-tail" />
            {text}
        </div>
    );
}
