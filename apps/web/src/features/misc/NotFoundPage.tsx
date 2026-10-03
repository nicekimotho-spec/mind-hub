import { LinkButton } from "../../components/LinkButton";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="text-2xl font-semibold text-stone-900">Page not found</h1>
      <p className="mt-2 text-sm text-stone-500">The page you&apos;re looking for doesn&apos;t exist or may have moved.</p>
      <LinkButton to="/" className="mt-6">
        Back home
      </LinkButton>
    </div>
  );
}
