"use client";

export default function Avatar({ photo, name, size }: { photo: string | null; name: string; size: string }) {
    if (photo) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={name} className={`${size} rounded-full object-cover border-2 border-border shrink-0`} />
        );
    }
    return (
        <div className={`${size} rounded-full bg-gradient-to-br from-rose-600 to-red-900 border-2 border-border flex items-center justify-center font-bold text-white shadow-lg shadow-rose-500/20 shrink-0`}>
            {name.trim().substring(0, 2)}
        </div>
    );
}
