// tests/ohou-shopping-full.spec.ts 상단 수정

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// 전역 설정 무시 및 화면 크기 설정 (FHD 1920x1080)
test.use({ 
  storageState: { cookies: [], origins: [] },
  viewport: { width: 1920, height: 1080 }  // ★ 이 줄을 추가하세요!
});

test('통합 시나리오: 계단식 옵션 선택 및 장바구니 검증', async ({ browser }) => {
  // ... (이후 코드는 그대로)
  // [Step 0] 준비
  const authFile = path.join(__dirname, '../playwright/.auth/user.json');
  if (!fs.existsSync(authFile)) throw new Error('쿠키 파일이 없습니다. setup을 먼저 실행하세요!');

  const context = await browser.newContext({ storageState: authFile });
  await context.clearCookies({ domain: '.ohou.se' });
  await context.clearCookies({ domain: 'ohou.se' });
  const page = await context.newPage();

  // -------------------------------------------------------
  // [Step 1 ~ 6] 로그인 ~ 상품 진입
  // -------------------------------------------------------
  console.log('Step 1: 홈페이지 진입');
  await page.goto('/');
  
  console.log('Step 2: 로그인');
  await page.getByRole('link', { name: '로그인' }).click();
  await Promise.all([
    page.waitForURL('https://ohou.se/'), 
    page.locator('a[href*="/users/auth/naver"]').click()
  ]);
  
  console.log('Step 4: 검색');
  const searchInput = page.getByPlaceholder('통합검색');
  await searchInput.waitFor({ state: 'visible' });
  await searchInput.click();
  await searchInput.fill('의자');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  console.log('Step 5: 판매순 정렬');
  const shopTab = page.locator('nav').getByRole('link', { name: /쇼핑|스토어|전체/ }).first();
  await shopTab.click();
  await expect(page).toHaveURL(/\/productions\//);
  await page.waitForTimeout(1000);

  const sortBtn = page.getByRole('button').filter({ hasText: /순$/ }).first();
  if (await sortBtn.isVisible()) {
    await sortBtn.click();
    await page.getByRole('button', { name: '판매순' }).click();
    await page.waitForTimeout(3000); 
  }

  console.log('Step 6: 1위 상품 클릭');
  const firstProduct = page.locator('article a[href*="/goods/"]').first();
  await firstProduct.waitFor({ state: 'visible' });
  await firstProduct.click();
  await expect(page).toHaveURL(/\/productions|goods/);
  await page.waitForTimeout(2000);

  // -------------------------------------------------------
  // [Step 7] 계단식 옵션 선택 & 장바구니 담기
  // -------------------------------------------------------
  console.log('Step 7: 계단식 옵션 선택 시작');

  // 알림창 자동 닫기
  page.on('dialog', async dialog => await dialog.dismiss());

  // 1. 하단 구매 바 열기
  const openOptionBtn = page.locator('button').filter({ hasText: /장바구니|구매하기/ }).first();
  if (await openOptionBtn.isVisible()) {
      await openOptionBtn.click();
      await page.waitForTimeout(1000);
  }

  // 2. 옵션 목록 정의
  const optionSelectors = [
      null, // 0단계: 옵션 없이 시도
      page.locator('select[data-testid="first-depth-select"]').first(), 
      page.locator('select[data-testid="second-depth-select"]').first() 
  ];

  let success = false;

  // 3. 루프 시작
  for (let i = 0; i < optionSelectors.length; i++) {
      const currentOption = optionSelectors[i];

      // (A) 옵션 선택
      if (currentOption) {
          if (await currentOption.isVisible() && await currentOption.isEnabled()) {
              console.log(`  -> [시도 ${i}] 옵션 선택 중...`);
              try {
                  await currentOption.selectOption({ index: 1 }); 
                  await page.waitForTimeout(1000); 
              } catch (e) {}
          } else {
              continue; 
          }
      }

      // (B) 장바구니 담기 버튼 클릭
      const cartBtns = page.getByRole('button', { name: /장바구니/ });
      const count = await cartBtns.count();
      
      for (let j = 0; j < count; j++) {
          const btn = cartBtns.nth(j);
          const btnText = await btn.textContent();
          // '장바구니 가기'(팝업) 버튼은 제외하고 '담기' 버튼만 클릭
          if (await btn.isVisible() && await btn.isEnabled() && !btnText?.includes('가기')) {
              await btn.click();
              console.log('    -> 장바구니 담기 버튼 클릭!');
              await page.waitForTimeout(1500); 
              break; 
          }
      }

      // (C) 성공 검증: "장바구니 가기" 팝업이 떴는가?
      const successPopup = page.getByRole('button', { name: '장바구니 가기' }).or(
                           page.getByRole('link', { name: '장바구니 가기' })).or(
                           page.getByRole('link', { name: '장바구니 보러가기' }));

      if (await successPopup.isVisible()) {
          console.log('  -> 🎉 "장바구니 가기" 팝업 발견! 클릭하여 이동합니다.');
          // 팝업의 "장바구니 가기" 버튼을 클릭해서 이동
          await successPopup.first().click();
          success = true;
          break; 
      } else {
          console.log('  -> ❌ 팝업 안 뜸. 다음 옵션 시도...');
      }
  }

  // -------------------------------------------------------
  // [Step 8] 최종 결과 검증 (장바구니 페이지)
  // -------------------------------------------------------
  console.log('Step 8: 장바구니 상품 확인');
  
  if (success) {
      // 1. 장바구니 페이지 URL 확인
      await expect(page).toHaveURL(/cart/, { timeout: 10000 });
      console.log('  -> 장바구니 페이지 진입 확인');

      // 2. 실제 상품이 리스트에 있는지 확인 (가장 중요한 부분!)
      // 장바구니에는 보통 상품명 링크(a 태그)가 있습니다.
      // "장바구니가 비어있습니다" 메시지가 없고, 상품 링크가 하나라도 있으면 성공입니다.
      const cartItem = page.locator('a[href*="/goods/"], a[href*="/productions/"]').first();
      
      try {
          await expect(cartItem).toBeVisible({ timeout: 5000 });
          console.log('  -> ✅ 장바구니 리스트에 상품이 존재합니다!');
          console.log('🎉 테스트 최종 통과!');
      } catch (e) {
          throw new Error('장바구니 페이지엔 갔지만, 상품이 보이지 않습니다.');
      }

  } else {
      throw new Error('장바구니 담기 단계에서 실패했습니다.');
  }
  
  await page.waitForTimeout(2000);
});