import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { Section } from "@/components/layout/Section";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <PageContainer>
      <Section className="flex flex-col items-center justify-center min-h-screen gap-4 text-center">
        <h1 className="text-2xl font-semibold">Ecom Admin Panel</h1>
        <p className="text-muted-foreground">
          Frontend scaffold is ready. Build order: Login, then the rest of the modules.
        </p>
        <Button asChild>
          <Link href="/login">Go to login</Link>
        </Button>
      </Section>
    </PageContainer>
  );
}
