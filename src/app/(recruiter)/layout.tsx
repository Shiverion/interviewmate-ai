import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

export default function RecruiterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen">
            <Header />
            <Sidebar />
            <main className="lg:pl-64 pt-0">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
