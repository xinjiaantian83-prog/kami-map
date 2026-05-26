# 地域別データ構造

かみマップの地域生活インフラデータは、地域ごとに分けて管理します。

```text
data/region/
  chuyo/
    aed/
    shelters/
    recycle/
```

## 追加方針

- `aed/`: AED設置場所。公式CSV/オープンデータを優先。
- `shelters/`: 避難所・避難場所。自治体公式情報、または公式オープンデータを優先。
- `recycle/`: 古紙回収BOXなど生活インフラ。

南予・東予を追加する場合は、`data/region/nanyo/`、`data/region/toyo/` のように同じ構造で追加します。

各データには、可能な限り `municipality`、`sourceUrl`、`lastChecked` を入れます。
