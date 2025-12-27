// tests/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('로그인 세션 확인 및 생성', async ({ page }) => {
  // ⚠️ 수동 로그인이 필요할 때를 대비해 타임아웃을 무제한(0)으로 풉니다.
  // (아까 30000ms 에러가 난 이유 해결)
  setup.setTimeout(0); 

  console.log('🔵 세션 상태를 확인합니다...');

  // 1. 기존에 저장된 세션 파일이 있는지 확인
  if (fs.existsSync(authFile)) {
    // 파일이 있으면 브라우저에 쿠키를 심어봅니다.
    const user = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
    await page.context().addCookies(user.cookies);
    
    // 메인으로 이동해서 '글쓰기' 버튼이 보이는지 테스트
    await page.goto('https://ohou.se');
    
    try {
      // 3초 안에 글쓰기 버튼이 보이면 로그인 유효함
      const writeButton = page.getByRole('button', { name: '글쓰기', exact: false });
      await expect(writeButton).toBeVisible({ timeout: 3000 });
      
      console.log('✅ 기존 세션이 유효합니다! 수동 로그인을 건너뜁니다.');
      // 파일이 잘 작동하므로 여기서 테스트 종료 (Pass)
      return; 
    } catch (e) {
      console.log('⚠️ 기존 세션이 만료되었습니다. 다시 로그인을 시도합니다.');
    }
  }

  // 2. 파일이 없거나 로그인이 풀렸다면 -> 수동 로그인 진행
  console.log('🟡 [Action Required] 브라우저에서 직접 로그인을 진행해주세요!');
  await page.goto('https://ohou.se/users/sign_in');

  // 글쓰기 버튼이 보일 때까지 무한 대기
  await page.getByRole('button', { name: '글쓰기', exact: false }).waitFor({ state: 'visible', timeout: 0 });

  console.log('🟢 새 로그인 감지됨!');
  
  // 3. 새 쿠키 저장
  await page.context().storageState({ path: authFile });
  console.log('🟢 세션 저장 완료');
});