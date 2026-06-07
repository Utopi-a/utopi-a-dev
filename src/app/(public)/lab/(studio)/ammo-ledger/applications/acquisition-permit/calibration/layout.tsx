export default function AcquisitionPermitCalibrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative left-1/2 w-screen max-w-none -translate-x-1/2 px-0.5 sm:px-1">
      {children}
    </div>
  );
}
