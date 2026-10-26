import { AccountPanel } from "@/components/AccountPanel";
import { ProfileMenu } from "@/components/account/ProfileMenu";
import { Logo } from "@/components/room/RoomHeader";
import { HomeActions } from "./HomeActions";

// 넓은 화면: 왼쪽은 소개·모임 만들기·초대 참여, 오른쪽은 내 모임 목록. 좁은 화면에서는 위아래로 쌓인다.
export default function HomePage() {
  return (
    <main className="mx-auto grid w-full max-w-md flex-1 content-start gap-8 px-4 pt-10 pb-8 md:max-w-lg md:pt-16 lg:max-w-5xl lg:grid-cols-2 lg:gap-12">
      {/* 오른쪽 위 프로필 메뉴 (넓은 화면에서는 두 칸 위에 걸쳐 놓인다) */}
      <div className="-mb-6 flex justify-end lg:col-span-2 lg:-mb-10">
        <ProfileMenu />
      </div>
      <div>
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
      </div>
      <div className="lg:sticky lg:top-16 lg:self-start">
        <AccountPanel />
      </div>
    </main>
  );
}
