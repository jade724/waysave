// MobileFrame.tsx
// Centers the phone nicely on desktop and adds a strong product-y shadow.

export default function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-screen h-full bg-black flex items-center justify-center py-6">
      <div
        className="
          relative w-[420px] max-w-full
          bg-[#0D0F14] min-h-[780px]           h-[min(900px,calc(100dvh-3rem))]
          rounded-[48px]
          shadow-[0_40px_120px_rgba(0,0,0,0.75)]
          overflow-hidden
          flex flex-col
          pt-10 pb-8
        "
      >
        {children}
      </div>
    </div>
  );
}
