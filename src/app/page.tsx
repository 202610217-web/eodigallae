import { ProfileMenu } from "@/components/account/ProfileMenu";
import { Logo } from "@/components/room/RoomHeader";
import { HomeActions } from "./HomeActions";
import { HomeGuide } from "./HomeGuide";
import { HomeLayout } from "./HomeLayout";

// 칸 배치(내 모임이 있을 때·없을 때, 좁은·넓은 화면)는 HomeLayout이 정한다.
export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-5 pb-12 md:max-w-lg md:pt-8 lg:max-w-5xl">
      <header className="flex items-center justify-between gap-3">
        <Logo />
        <ProfileMenu />
      </header>
      <HomeLayout
        hero={
          <div>
            <h1 className="text-[28px] leading-tight font-extrabold md:text-[32px]">
              취향은 모으고,
              <br />
              결정은 함께!
            </h1>
            <p className="mt-3 max-w-[34ch] text-ink-soft">
              식사·활동·숙소마다 친구들의 의견을 모으고, 후보를 올린 뒤 투표나 게임으로 함께 정해요.
            </p>
          </div>
        }
        actions={<HomeActions />}
        guide={<HomeGuide />}
      />
    </main>
  );
}
