"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { FieldError } from "@/components/ui/Field";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { HOME_PRIMARY } from "./homeStyles";

const CODE_LENGTH = 6;
const EMPTY = Array<string>(CODE_LENGTH).fill("");

// 서버의 normalizeInviteCode와 같은 규칙: 영문 대문자·숫자만
const sanitize = (raw: string) => raw.toUpperCase().replace(/[^0-9A-Z]/g, "");

/** 초대 코드 6칸 입력 + 참여하기, 그리고 처음 온 사람을 위한 안내·데모 링크 */
export function HomeActions() {
  const router = useRouter();
  const [chars, setChars] = useState<string[]>(EMPTY);
  // incomplete: 칸이 비어 있음 / invalid: 서버에서 확인하지 못한 코드
  const [error, setError] = useState<{ kind: "incomplete" | "invalid"; message: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const focusBox = (i: number) => {
    const el = inputs.current[Math.max(0, Math.min(CODE_LENGTH - 1, i))];
    el?.focus();
    el?.select();
  };

  // start 칸부터 text를 차례로 채우고, 채운 다음 칸으로 포커스를 옮긴다
  const fillFrom = (start: number, text: string) => {
    const clean = sanitize(text).slice(0, CODE_LENGTH - start);
    if (!clean) return;
    setChars((prev) => {
      const next = [...prev];
      [...clean].forEach((c, k) => (next[start + k] = c));
      return next;
    });
    setError(null);
    focusBox(start + clean.length);
  };

  const setAt = (i: number, value: string) => {
    setChars((prev) => prev.map((c, k) => (k === i ? value : c)));
    setError(null);
  };

  const onChange = (i: number, raw: string) => {
    const value = sanitize(raw);
    if (!value) return setAt(i, "");
    // 이미 글자가 있는 칸에 이어 쳤으면 새 글자로 바꾼다. 자동 완성처럼 여러 글자가 들어오면 다음 칸으로 나눈다.
    if (value.length === 2 && value[0] === chars[i]) return fillFrom(i, value[1]);
    fillFrom(i, value);
  };

  const onPaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    // 초대 링크 전체를 붙여넣으면 마지막 경로를 코드로 쓴다
    const fromLink = text.match(/join\/([0-9A-Za-z]+)/)?.[1];
    const code = fromLink ?? text;
    fillFrom(fromLink || sanitize(code).length >= CODE_LENGTH ? 0 : i, code);
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !chars[i] && i > 0) {
      e.preventDefault();
      setAt(i - 1, "");
      focusBox(i - 1);
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      focusBox(i - 1);
    } else if (e.key === "ArrowRight" && i < CODE_LENGTH - 1) {
      e.preventDefault();
      focusBox(i + 1);
    }
  };

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = chars.join("");
    if (code.length !== CODE_LENGTH) {
      setError({ kind: "incomplete", message: `초대 코드 ${CODE_LENGTH}자리를 모두 입력해주세요. 초대 링크를 붙여넣어도 돼요.` });
      focusBox(chars.findIndex((c) => !c));
      return;
    }
    // 이동하기 전에 코드가 맞는지 확인해, 틀렸으면 입력한 내용을 그대로 두고 여기서 알려준다
    setChecking(true);
    try {
      await api(`/api/invite/${code}`);
      router.push(`/join/${code}`);
    } catch (err) {
      setError({ kind: "invalid", message: err instanceof Error ? err.message : "초대 코드를 확인하지 못했어요." });
      setChecking(false);
    }
  };

  const linkClass =
    "inline-flex min-h-10 items-center gap-1.5 self-start rounded-md text-[13px] text-ink-soft transition-colors hover:text-ink md:min-h-8 md:text-[15px]";

  return (
    <form
      onSubmit={join}
      noValidate
      className="rounded-[var(--radius-card)] border border-line/70 bg-white px-4 pt-4 pb-2 md:px-8 md:pt-5 md:pb-3 lg:py-5"
    >
      <div className="md:flex md:flex-wrap md:items-center md:gap-x-6 lg:flex-nowrap lg:gap-x-5 xl:gap-x-7">
        <h2 id="invite-title" className="text-[15px] font-bold md:w-[140px] md:shrink-0 md:text-lg">
          초대 코드로 참여
        </h2>
        <div className="mt-2.5 flex items-center gap-2 md:mt-0 md:gap-5 xl:gap-11">
          <div
            role="group"
            aria-labelledby="invite-title"
            aria-describedby={error ? "invite-code-error" : undefined}
            className="flex min-w-0 flex-1 gap-1 md:flex-none md:gap-2 xl:gap-2.5"
          >
            {chars.map((c, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                value={c}
                aria-label={`초대 코드 ${i + 1}번째 글자`}
                aria-invalid={(error?.kind === "invalid" || (error?.kind === "incomplete" && !c)) || undefined}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint={i === CODE_LENGTH - 1 ? "go" : "next"}
                onChange={(e) => onChange(i, e.target.value)}
                onPaste={(e) => onPaste(i, e)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                className="h-11 w-0 min-w-0 flex-1 rounded-[10px] border border-line bg-white text-center text-lg font-bold text-ink uppercase focus:border-coral-strong focus:shadow-[inset_0_0_0_1px_var(--color-coral-strong)] focus:outline-none aria-invalid:border-danger-ink md:h-[54px] md:w-11 md:flex-none md:text-xl xl:w-[46px]"
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={checking}
            aria-busy={checking || undefined}
            className={cn(HOME_PRIMARY, "h-11 shrink-0 rounded-[10px] px-3.5 text-sm md:h-[54px] md:px-6 md:text-lg xl:px-7")}
          >
            {checking ? "확인 중…" : "참여하기"}
          </button>
        </div>

        <span className="hidden h-14 w-px shrink-0 bg-line lg:block" aria-hidden />

        <nav aria-label="처음 왔다면" className="mt-3.5 flex flex-col border-t border-line pt-1.5 md:mt-4 md:basis-full md:flex-row md:gap-6 md:pt-2 lg:mt-0 lg:basis-auto lg:flex-col lg:gap-0 lg:border-0 lg:pt-0">
          <Link href="#home-guide" className={linkClass}>
            처음이라면 사용 방법 보기
            <ChevronRight className="size-3.5 shrink-0 md:size-4" aria-hidden />
          </Link>
          <Link href="/demo" className={linkClass}>
            데모 둘러보기
            <ChevronRight className="size-3.5 shrink-0 md:size-4" aria-hidden />
          </Link>
        </nav>
      </div>
      <div className="[&>p]:mb-2 md:[&>p]:mb-0">
        <FieldError id="invite-code-error">{error?.message}</FieldError>
      </div>
    </form>
  );
}
