// ScreenWrapper.tsx
export default function ScreenWrapper({ children }: { children: any }) {
  return (
    <div className="w-full h-full overflow-y-auto px-5 pb-6 pt-6">
      {children}
    </div>
  );
}
