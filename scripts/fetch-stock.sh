#!/bin/bash
# Download curated Unsplash food photography into public/images
# Only downloads files that don't already exist. Verifies each response.
set -u
DIR="/home/z/my-project/public/images"
mkdir -p "$DIR"

# file => candidate URLs (first that works wins)
declare -A IMAGES=(
  ["cat-burgers.png"]="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&q=80|https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=900&q=80"
  ["cat-pizza.png"]="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&q=80|https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=900&q=80"
  ["cat-chicken.png"]="https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=900&q=80|https://images.unsplash.com/photo-1562967914-608f82629710?w=900&q=80"
  ["cat-wraps.png"]="https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=900&q=80|https://images.unsplash.com/photo-1600891964092-4316c288032e?w=900&q=80"
  ["cat-pasta.png"]="https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=900&q=80|https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=900&q=80"
  ["cat-desserts.png"]="https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?w=900&q=80|https://images.unsplash.com/photo-1551024506-0bccd828d307?w=900&q=80"
  ["cat-drinks.png"]="https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=900&q=80|https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=900&q=80"
  ["cat-combos.png"]="https://images.unsplash.com/photo-1610614819513-58e34989848b?w=900&q=80|https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=900&q=80"

  ["p-classic-smash.png"]="https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=900&q=80|https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&q=80"
  ["p-double-cheese-blaze.png"]="https://images.unsplash.com/photo-1550317138-10000687a72b?w=900&q=80|https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=900&q=80"
  ["p-peri-peri-chicken.png"]="https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=900&q=80|https://images.unsplash.com/photo-1513185158878-8d8c2a2a3da3?w=900&q=80"
  ["p-veg-supreme.png"]="https://images.unsplash.com/photo-1520072959219-c595dc870360?w=900&q=80|https://images.unsplash.com/photo-1615297928064-24977384d0da?w=900&q=80"
  ["p-margherita.png"]="https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=900&q=80|https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=900&q=80"
  ["p-pepperoni-feast.png"]="https://images.unsplash.com/photo-1534307989840-4190cbcdec21?w=900&q=80|https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&q=80"
  ["p-farmhouse.png"]="https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=900&q=80|https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&q=80"
  ["p-crispy-bucket.png"]="https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=900&q=80|https://images.unsplash.com/photo-1562967916-eb82221dfb92?w=900&q=80"
  ["p-zinger-wings.png"]="https://images.unsplash.com/photo-1608039755401-742074f0548d?w=900&q=80|https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=900&q=80"
  ["p-paneer-tikka-wrap.png"]="https://images.unsplash.com/photo-1600891964092-4316c288032e?w=900&q=80|https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=900&q=80"
  ["p-chicken-kebab-wrap.png"]="https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=900&q=80|https://images.unsplash.com/photo-1615297928064-24977384d0da?w=900&q=80"
  ["p-alfredo.png"]="https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=900&q=80|https://images.unsplash.com/photo-1556761223-4c4282c73f77?w=900&q=80"
  ["p-arrabbiata.png"]="https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=900&q=80|https://images.unsplash.com/photo-1608219992759-8d74ed8d76eb?w=900&q=80"
  ["p-choco-lava.png"]="https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&q=80|https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?w=900&q=80"
  ["p-gulab-jamun-cheesecake.png"]="https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=900&q=80|https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=900&q=80"
  ["p-virgin-mojito.png"]="https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=900&q=80|https://images.unsplash.com/photo-1497534446932-c925b458314e?w=900&q=80"
  ["p-choco-shake.png"]="https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=900&q=80|https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=900&q=80"
  ["p-masala-lemonade.png"]="https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=900&q=80|https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?w=900&q=80"
  ["p-blaze-duo.png"]="https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=900&q=80|https://images.unsplash.com/photo-1610614819513-58e34989848b?w=900&q=80"
  ["p-family-feast.png"]="https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=900&q=80|https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=900&q=80"
  ["offer-banner.png"]="https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=1600&q=80|https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1600&q=80"
  ["placeholder.png"]="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&q=80"
)

ok=0; skip=0; fail=0
for file in "${!IMAGES[@]}"; do
  target="$DIR/$file"
  if [ -s "$target" ]; then skip=$((skip+1)); continue; fi
  IFS='|' read -ra CANDIDATES <<< "${IMAGES[$file]}"
  downloaded=0
  for url in "${CANDIDATES[@]}"; do
    if curl -sfL -m 20 -o "$target.tmp" "$url" && [ "$(stat -c%s "$target.tmp" 2>/dev/null || echo 0)" -gt 15000 ]; then
      mv "$target.tmp" "$target"
      echo "OK   $file"
      downloaded=1; ok=$((ok+1)); break
    fi
  done
  if [ "$downloaded" -eq 0 ]; then
    rm -f "$target.tmp"
    echo "FAIL $file"
    fail=$((fail+1))
  fi
done
echo "DONE ok=$ok skip=$skip fail=$fail"
