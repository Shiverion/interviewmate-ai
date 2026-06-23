import Header from "@/components/layout/Header";
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
                <main>
                    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                        <KeyGate>{children}</KeyGate>
                    </div>
                </main>
            </div>
        </AuthGate>
    );
}
