// Shared header — compact white bar with the wordmark, used on all pages.
// Red italic "zomato", charcoal "-lite". Clicking it returns to the list.
import Link from "next/link";

export function Logo() {
  return (
    <div className="rounded-xl bg-white px-4 py-3">
      <Link href="/" className="text-lg tracking-tight">
        <span className="font-extrabold italic text-[#E4572E]">zomato</span>
        <span className="font-semibold text-[#24292E]">-lite</span>
      </Link>
    </div>
  );
}
