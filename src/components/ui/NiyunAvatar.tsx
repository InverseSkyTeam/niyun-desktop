interface NiyunAvatarProps {
    size?: number;
}

export function NiyunAvatar({ size = 32 }: NiyunAvatarProps) {
    return (
        <div
            className="flex shrink-0 items-center justify-center rounded-full bg-white dark:bg-brand-50"
            style={{ width: size, height: size }}
        >
            <img
                src="/niyun.png"
                alt="逆云"
                className="h-full w-full rounded-full object-cover"
            />
        </div>
    );
}
