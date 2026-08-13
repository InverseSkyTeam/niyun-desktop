interface PetContextMenuProps {
    visible: boolean;
    pos: { x: number; y: number };
    onFeed: () => void;
    onPeek: () => void;
    onPet: () => void;
}

export function PetContextMenu({
    visible,
    pos,
    onFeed,
    onPeek,
    onPet,
}: PetContextMenuProps) {
    if (!visible) return null;
    return (
        <div
            className="context-menu"
            style={{ left: pos.x, top: pos.y }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <button type="button" className="menu-item" onClick={onFeed}>
                投喂小鱼干
            </button>
            <button type="button" className="menu-item" onClick={onPeek}>
                偷看屏幕
            </button>
            <button type="button" className="menu-item" onClick={onPet}>
                摸摸头
            </button>
        </div>
    );
}
