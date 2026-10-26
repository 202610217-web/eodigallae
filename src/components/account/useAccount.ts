"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { api } from "@/lib/client/api";
import type { CharacterKey, ColorKey } from "@/lib/domain/constants";

export interface Account {
  username: string;
  nickname: string;
  character: CharacterKey;
  color: ColorKey;
  hasProfile: boolean;
  hasRecovery: boolean;
  createdAt: number;
}

/** 내 프로필·계정 정보. 로그인이 끊겼으면 null */
export function useAccount() {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const reload = useCallback(async () => {
    try {
      const { account } = await api<{ account: Account }>("/api/account");
      setAccount(account);
      return account;
    } catch {
      setAccount(null);
      return null;
    }
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(t);
  }, [reload]);
  return { account, setAccount, reload };
}

type ProfileDraft = { nickname: string; character: CharacterKey; color: ColorKey };

/** 모임 만들기·참여·데모 화면: 프로필 설정에 저장해 둔 닉네임·캐릭터·색을 미리 채운다(이미 입력을 시작했으면 그대로 둔다) */
export function usePrefillProfile(setProfile: Dispatch<SetStateAction<ProfileDraft>>) {
  useEffect(() => {
    let alive = true;
    api<{ account: Account }>("/api/account")
      .then(({ account }) => {
        if (!alive || !account.hasProfile) return;
        setProfile((p) => (p.nickname ? p : { nickname: account.nickname, character: account.character, color: account.color }));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [setProfile]);
}
