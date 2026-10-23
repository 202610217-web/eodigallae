import { HomeActions } from "./HomeActions";
import { Logo } from "@/components/room/RoomHeader";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-10 pb-8 md:max-w-lg md:pt-16">
      <div className="mb-8">
        <Logo />
        <h1 className="mt-6 text-[28px] leading-tight font-extrabold">
          취향은 모으고,
          <br />
          결정은 함께!
        </h1>
        <p className="mt-2 text-ink-soft">친구들과 조건을 모으고 후보를 비교한 뒤, 투표·룰렛·연타 게임으로 여행지를 정해요.</p>
      </div>
      <HomeActions />
    </main>
  );
}
