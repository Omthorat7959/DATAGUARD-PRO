import "./globals.css";

export const metadata = {
  title: "DataGuard PRO — Enterprise Data Quality Platform",
  description: "Validate, monitor, and fix data quality issues across CSV files and live database connections.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
