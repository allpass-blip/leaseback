デスクトップデザイン調整（2026-09-05）

対象: test/index.html

前回のデザインレビューに沿って、イラスト、人物写真の大きさ、文字組み、査定額の図版、余白とパーツの仕上げを調整。

- 冒頭は見出し・特徴・ボタン・電話を一つのグループにまとめ、広い画面での縦の空きを縮小。
- お悩みの人物イラストを紺の細線・淡い青・金のアクセントに変更。表示上限を560pxに設定。
- 監修部分は白地と余白を使い、写真を最大540px高、見出しを最大44px、氏名を最大40pxに調整。
- 一般見出しを34〜44px、事例・FAQ本文を16px、流れの本文を17pxに整理。
- 査定額の図版をHTMLと罫線で組み直し、既存の価格・物件情報を維持。末尾の人物写真と分けて配置。
- FAQボタンを単色に統一。電話番号をNoto Sans JPに揃え、選択欄の矢印を共通化。

確認

- 1920px幅・1366px幅で主要セクションを目視確認。
- 900px幅で見出し・図版のはみ出しを確認し、人物写真の位置を補正。
- 390px幅で全セクションの高さ、見出しサイズ、主要要素の幅が作業開始時と一致。
- 冒頭のボタンから最終フォームへの移動、都道府県メニューの開閉を確認。
- node --test "tests/*.test.mjs": 11件成功。
- git diff --check: 指摘なし。
- 既存のデザイン検出器の2件は前回と同じ。実表示の2書体併用と、意味のある手順番号を確認したため変更対象外。

画像生成の記録

方法: 組み込みの image_gen。生成後にWebPへ変換・縮小して配置。

使用画像: ../test/assets/variant-b/images/worries-couple-desktop-v2.webp （1120×1120、78,066 bytes）

最初のプロンプト:

Use case: style-transfer. Asset type: production illustration for a Japanese home leaseback landing page. Image 1 is the edit target: keep the two older Japanese people, the man on the left with glasses and folded arms, woman on the right with a hand near her cheek, and gently concerned expressions. Image 2 is a supporting style reference ONLY for the refined thin navy and muted-gold line weight and clean restrained palette. Redraw image 1 as polished, anatomically natural commercial line illustration with more realistic adult proportions, delicate consistent navy #062d60 contours, tiny muted gold #c99e39 accents, sparse very pale blue-gray and white flat fills, light gray hair. Keep the couple waist-up side-by-side with complete heads and hands, visually calm and dignified. No heavy black outlines, no sketch marks, no exaggerated cartoon faces, no texture, no gradients, no shadows, no lettering, no symbols, no extra objects. Square composition, about 10% clear margin around the combined silhouettes. Background must be genuinely transparent with clean alpha edges, no checkerboard baked into image. Do not reproduce any objects from image 2. Generate one finished raster asset.

背景調整の最終プロンプト:

Edit this illustration. Change ONLY its background: remove the entire gray checkerboard pattern and replace it with perfectly uniform solid pure white #FFFFFF. This will be composited on the website using multiply blend, so no transparency simulation is wanted. Keep the two people, their proportions, thin navy outlines, soft blue-gray and white clothes, muted gold accents, expressions and poses exactly as they are. All space outside their silhouettes must be completely blank white with no checkerboard, shadow, gradient, texture, or text. Output a single square production-ready raster illustration.
