import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import KeyGate from "@/components/layout/KeyGate";
import AuthGate from "@/components/layout/AuthGate";

export default function RecruiterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGate>
            <div className="min-h-screen">
                <Header />
                <Sidebar />
                <main className="lg:pl-64 pt-0">
                    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                        <KeyGate>{children}</KeyGate>
                    </div>
                </main>
            </div>
        </AuthGate>
    );
}
