/* Verified options from https://pocafe.ru/, retrieved 2026-10-15T15:47:22Z.
 * Tilda exposes source record/product IDs and option values, without variation SKUs or stock.
 * Combination IDs are LOCAL catalogue IDs, not source SKUs:
 * parent slug + '--' + first 16 hex characters of SHA-256(JSON.stringify(
 * [sourceRecordId, sourceProductId, sortedPairs])). Each pair is
 * [group.label.normalize('NFC').trim(), option.value.normalize('NFC').trim()],
 * sorted by the group label in Unicode code-point order. Option/group reordering
 * therefore preserves combination IDs. No price or positional index enters the hash.
 * Numeric Tilda option prices replace the base price; listed prices are final.
 * The payment backend must resolve IDs against its trusted server catalogue.
 */
window.CAFE_PRODUCTS = [
  {
    "id": "pho-bo",
    "name": "Фо Бо",
    "category": "soups",
    "description": "Пряный томленый говяжий бульон, говяжья вырезка, томленая говядина, рисовая лапша. Отдельно подаются кинза, базилик, мята, ростки сои, лайм и соусы (3 шт.)",
    "price": 750,
    "image": "./assets/pho-bo.webp",
    "spicy": false,
    "popular": true,
    "tag": "Фирменный",
    "sourceProductId": "1497456130776",
    "sourceRecordId": "rec373493392"
  },
  {
    "id": "tom-yum-seafood",
    "name": "Том Ям Кхати с морепродуктами",
    "category": "soups",
    "description": "Кисло-остро-пряный суп с томатами черри, грибами цао гу, ростками сои и кинзой с добавлением кокосового молока, креветок и кальмара. Отдельно подаются рис и лайм",
    "price": 850,
    "image": "./assets/tom-yum.webp",
    "spicy": true,
    "popular": true,
    "tag": "Острое",
    "sourceProductId": "1786898469755",
    "sourceRecordId": "rec373493392",
    "optionGroups": [
      {
        "id": "option-0",
        "label": "Острота",
        "defaultValue": "Острый",
        "options": [
          {
            "value": "Острый",
            "label": "Острый",
            "priceDelta": 0
          },
          {
            "value": "Средне-острый",
            "label": "Средне-острый",
            "priceDelta": 0
          }
        ]
      }
    ],
    "variants": [
      {
        "id": "tom-yum-seafood--2ecd8d4e756a1637",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Острый"
        },
        "price": 850,
        "available": null
      },
      {
        "id": "tom-yum-seafood--a786b0f3b04e8547",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Средне-острый"
        },
        "price": 850,
        "available": null
      }
    ],
    "defaultAttributes": {
      "option-0": "Острый"
    },
    "priceFrom": false
  },
  {
    "id": "pad-thai",
    "name": "Лапша ПадТай",
    "category": "wok",
    "description": "Рисовая лапша с яйцом, овощами, с курицей и креветками в соусе на основе тамаринда, посыпается арахисом, подается с лаймом",
    "price": 750,
    "image": "./assets/pad-thai.webp",
    "spicy": false,
    "popular": true,
    "tag": "Хит",
    "sourceProductId": "1659012360949",
    "sourceRecordId": "rec373511433"
  },
  {
    "id": "shrimp-wasabi",
    "name": "Креветки васаби",
    "category": "snacks",
    "description": "Креветки (5 шт.) в соусе на основе сгущенного молока с васаби, подаются с креветочными чипсами",
    "price": 590,
    "image": "./assets/shrimp-wasabi.webp",
    "spicy": true,
    "popular": true,
    "tag": "Хит",
    "sourceProductId": "1635619569777",
    "sourceRecordId": "rec373367566"
  },
  {
    "id": "sweet-sour-chicken",
    "name": "Курица в кисло-сладком соусе",
    "category": "hot",
    "description": "Куриное филе в кляре, обжаренное с овощами и ананасом в кисло-сладком соусе. С гарниром/без гарнира",
    "price": 650,
    "image": "./assets/sweet-sour-chicken.webp",
    "spicy": false,
    "popular": true,
    "tag": "Хит",
    "sourceProductId": "1659016881760",
    "sourceRecordId": "rec373515503",
    "optionGroups": [
      {
        "id": "option-0",
        "label": "Гарнир",
        "defaultValue": "Без гарнира",
        "options": [
          {
            "value": "Без гарнира",
            "label": "Без гарнира",
            "priceDelta": 0
          },
          {
            "value": "Рис 150 р.",
            "label": "Рис",
            "priceDelta": 150
          }
        ]
      }
    ],
    "variants": [
      {
        "id": "sweet-sour-chicken--ff0fc6e715684d52",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Без гарнира"
        },
        "price": 650,
        "available": null
      },
      {
        "id": "sweet-sour-chicken--7bcac9b5ae197a64",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Рис 150 р."
        },
        "price": 800,
        "available": null
      }
    ],
    "defaultAttributes": {
      "option-0": "Без гарнира"
    },
    "priceFrom": true
  },
  {
    "id": "smashed-cucumbers",
    "name": "Битые огурцы по-китайски",
    "category": "snacks",
    "description": "Свежие огурцы, кинза, арахис в кисло-остром соусе",
    "price": 490,
    "image": "./assets/smashed-cucumbers.webp",
    "spicy": true,
    "popular": true,
    "tag": "Острое",
    "sourceProductId": "1497456130776",
    "sourceRecordId": "rec373367566"
  },
  {
    "id": "cherry-kimchi",
    "name": "Черри в соусе кимчи",
    "category": "snacks",
    "description": "Томаты черри, маринованные в остром соусе кимчи",
    "price": 490,
    "image": "./assets/cherry-kimchi.webp",
    "spicy": true,
    "popular": false,
    "sourceProductId": "1699511727022",
    "sourceRecordId": "rec373367566"
  },
  {
    "id": "shrimp-spicy",
    "name": "Креветки спайси",
    "category": "snacks",
    "description": "Хрустящие креветки в кляре с соусом спайси",
    "price": 590,
    "image": "./assets/shrimp-spicy.webp",
    "spicy": true,
    "popular": false,
    "sourceProductId": "1699521530515",
    "sourceRecordId": "rec373367566",
    "optionGroups": [
      {
        "id": "option-0",
        "label": "Соус на выбор",
        "defaultValue": "Спайси (острый)",
        "options": [
          {
            "value": "Спайси (острый)",
            "label": "Спайси (острый)",
            "priceDelta": 0
          },
          {
            "value": "Сладкий чили",
            "label": "Сладкий чили",
            "priceDelta": 0
          }
        ]
      }
    ],
    "variants": [
      {
        "id": "shrimp-spicy--96fe04976393f5bd",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Спайси (острый)"
        },
        "price": 590,
        "available": null
      },
      {
        "id": "shrimp-spicy--9395da0710e7400d",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Сладкий чили"
        },
        "price": 590,
        "available": null
      }
    ],
    "defaultAttributes": {
      "option-0": "Спайси (острый)"
    },
    "priceFrom": false
  },
  {
    "id": "mushroom-salad",
    "name": "Салат из чёрных грибов и лука",
    "category": "snacks",
    "description": "Древесные грибы Муер, красный и зеленый лук в пикантном соусе",
    "price": 290,
    "image": "./assets/mushroom-salad.webp",
    "spicy": false,
    "popular": false,
    "sourceProductId": "1635620838300",
    "sourceRecordId": "rec373367566"
  },
  {
    "id": "crispy-eggplant",
    "name": "Салат из хрустящих баклажан с помидорами",
    "category": "snacks",
    "description": "Хрустящие баклажаны, помидоры, кинза в пряном соусе",
    "price": 590,
    "image": "./assets/crispy-eggplant.webp",
    "spicy": false,
    "popular": false,
    "sourceProductId": "1516274392962",
    "sourceRecordId": "rec373367566"
  },
  {
    "id": "shrimp-chips",
    "name": "Креветочные чипсы",
    "category": "snacks",
    "description": "Порция креветочных чипсов с соусом сладкий чили",
    "price": 190,
    "image": "./assets/shrimp-chips.webp",
    "spicy": false,
    "popular": false,
    "sourceProductId": "1699521147320",
    "sourceRecordId": "rec373367566"
  },
  {
    "id": "pho-ga",
    "name": "Фо Га",
    "category": "soups",
    "description": "Пряный томленый говяжий бульон, кусочки куриной грудки, рисовая лапша. Отдельно подаются кинза, базилик, мята, ростки сои, лайм и соусы (3 шт.)",
    "price": 750,
    "image": "./assets/pho-ga.webp",
    "spicy": false,
    "popular": false,
    "sourceProductId": "1498486301712",
    "sourceRecordId": "rec373493392"
  },
  {
    "id": "tom-yum-chicken",
    "name": "Том Ям Кхати с курицей",
    "category": "soups",
    "description": "Кисло-остро-пряный суп с томатами черри, грибами цао гу, ростками сои и кинзой с добавлением кокосового молока и куриной грудки. Отдельно подаются рис и лайм",
    "price": 690,
    "image": "./assets/tom-yum.webp",
    "spicy": true,
    "popular": false,
    "sourceProductId": "1498486363994",
    "sourceRecordId": "rec373493392",
    "optionGroups": [
      {
        "id": "option-0",
        "label": "Острота",
        "defaultValue": "Острый",
        "options": [
          {
            "value": "Острый",
            "label": "Острый",
            "priceDelta": 0
          },
          {
            "value": "Средне-острый",
            "label": "Средне-острый",
            "priceDelta": 0
          }
        ]
      }
    ],
    "variants": [
      {
        "id": "tom-yum-chicken--b59c19d89490dd07",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Острый"
        },
        "price": 690,
        "available": null
      },
      {
        "id": "tom-yum-chicken--3a3087b1727b6991",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Средне-острый"
        },
        "price": 690,
        "available": null
      }
    ],
    "defaultAttributes": {
      "option-0": "Острый"
    },
    "priceFrom": false
  },
  {
    "id": "wok-noodles",
    "name": "Лапша Вок (собери сам)",
    "category": "wok",
    "description": "Лапша с овощами микс (болгарский перец, морковь, цукини, пекинская капуста), обжаренная на вок. Начинка и лапша на выбор",
    "price": 420,
    "image": "./assets/wok-noodles.webp",
    "spicy": false,
    "popular": false,
    "priceFrom": true,
    "sourceProductId": "1497456130776",
    "sourceRecordId": "rec373511433",
    "optionGroups": [
      {
        "id": "option-0",
        "label": "Лапша",
        "defaultValue": "Удон (пшеничная широкая)",
        "options": [
          {
            "value": "Удон (пшеничная широкая)",
            "label": "Удон (пшеничная широкая)",
            "priceDelta": 0
          },
          {
            "value": "Рисовая",
            "label": "Рисовая",
            "priceDelta": 0
          },
          {
            "value": "Фунчеза (стеклянная)",
            "label": "Фунчеза (стеклянная)",
            "priceDelta": 0
          }
        ]
      },
      {
        "id": "option-1",
        "label": "Начинка",
        "defaultValue": "С овощами",
        "options": [
          {
            "value": "С овощами",
            "label": "С овощами",
            "priceDelta": 0
          },
          {
            "value": "С курицей 550 руб. ",
            "label": "С курицей",
            "priceDelta": 130
          },
          {
            "value": "С говядиной 690 руб. ",
            "label": "С говядиной",
            "priceDelta": 270
          },
          {
            "value": "С морепродуктами 690 руб. ",
            "label": "С морепродуктами",
            "priceDelta": 270
          }
        ]
      }
    ],
    "variants": [
      {
        "id": "wok-noodles--ab70373bcc0db49f",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Удон (пшеничная широкая)",
          "option-1": "С овощами"
        },
        "price": 420,
        "available": null
      },
      {
        "id": "wok-noodles--0d180bb68bba4f0b",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Удон (пшеничная широкая)",
          "option-1": "С курицей 550 руб. "
        },
        "price": 550,
        "available": null
      },
      {
        "id": "wok-noodles--4a657ad509e81c05",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Удон (пшеничная широкая)",
          "option-1": "С говядиной 690 руб. "
        },
        "price": 690,
        "available": null
      },
      {
        "id": "wok-noodles--89cabeee4b0f838c",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Удон (пшеничная широкая)",
          "option-1": "С морепродуктами 690 руб. "
        },
        "price": 690,
        "available": null
      },
      {
        "id": "wok-noodles--408e34597c7b8390",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Рисовая",
          "option-1": "С овощами"
        },
        "price": 420,
        "available": null
      },
      {
        "id": "wok-noodles--5a7b540bc75ad048",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Рисовая",
          "option-1": "С курицей 550 руб. "
        },
        "price": 550,
        "available": null
      },
      {
        "id": "wok-noodles--b7b45bb212f4dbd1",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Рисовая",
          "option-1": "С говядиной 690 руб. "
        },
        "price": 690,
        "available": null
      },
      {
        "id": "wok-noodles--557a046e3bc7dc38",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Рисовая",
          "option-1": "С морепродуктами 690 руб. "
        },
        "price": 690,
        "available": null
      },
      {
        "id": "wok-noodles--886c7cafac14947f",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Фунчеза (стеклянная)",
          "option-1": "С овощами"
        },
        "price": 420,
        "available": null
      },
      {
        "id": "wok-noodles--fd640e0efa9ae7ab",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Фунчеза (стеклянная)",
          "option-1": "С курицей 550 руб. "
        },
        "price": 550,
        "available": null
      },
      {
        "id": "wok-noodles--9fc71cdecb988aad",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Фунчеза (стеклянная)",
          "option-1": "С говядиной 690 руб. "
        },
        "price": 690,
        "available": null
      },
      {
        "id": "wok-noodles--0c41db6b1f56654e",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Фунчеза (стеклянная)",
          "option-1": "С морепродуктами 690 руб. "
        },
        "price": 690,
        "available": null
      }
    ],
    "defaultAttributes": {
      "option-0": "Удон (пшеничная широкая)",
      "option-1": "С овощами"
    }
  },
  {
    "id": "bakmi-goreng",
    "name": "Лапша БакМи Горенг",
    "category": "wok",
    "description": "Удон с овощами, яйцом, с курицей и креветками в соусе карри",
    "price": 750,
    "image": "./assets/bakmi-goreng.webp",
    "spicy": false,
    "popular": false,
    "sourceProductId": "1498486363994",
    "sourceRecordId": "rec373511433"
  },
  {
    "id": "singapore-noodles",
    "name": "Лапша Сингапур",
    "category": "wok",
    "description": "Традиционная сингапурская тонкая лапша с овощами, яйцом, с курицей и креветками в соусе карри",
    "price": 750,
    "image": "./assets/singapore-noodles.webp",
    "spicy": false,
    "popular": false,
    "sourceProductId": "1635680502550",
    "sourceRecordId": "rec373511433"
  },
  {
    "id": "egg-rice",
    "name": "Рис с яйцом и зеленым луком",
    "category": "wok",
    "description": "Рис, обжаренный на вок",
    "price": 290,
    "image": "./assets/egg-rice.webp",
    "spicy": false,
    "popular": false,
    "sourceProductId": "1659012913149",
    "sourceRecordId": "rec373511433"
  },
  {
    "id": "chicken-rice",
    "name": "Рис с курицей",
    "category": "wok",
    "description": "Рис, обжаренный на вок с курицей и овощами микс",
    "price": 490,
    "image": "./assets/chicken-rice.webp",
    "spicy": false,
    "popular": false,
    "sourceProductId": "1659012984829",
    "sourceRecordId": "rec373511433"
  },
  {
    "id": "thai-shrimp-rice",
    "name": "Рис по-тайски с креветками и овощами",
    "category": "wok",
    "description": "Рис жасмин обжаренный на вок, с креветками и овощами микс",
    "price": 690,
    "image": "./assets/thai-shrimp-rice.webp",
    "spicy": false,
    "popular": false,
    "sourceProductId": "1659013049128",
    "sourceRecordId": "rec373511433"
  },
  {
    "id": "shrimp-orange-kimchi",
    "name": "Креветки в соусе апельсиновый кимчи",
    "category": "hot",
    "description": "Креветки обжаренные в цитрусовом соусе с брокколи и сладким перцем. С гарниром/без гарнира",
    "price": 790,
    "image": "./assets/shrimp-orange-kimchi.webp",
    "spicy": true,
    "popular": false,
    "sourceProductId": "1699529227507",
    "sourceRecordId": "rec373515503",
    "optionGroups": [
      {
        "id": "option-0",
        "label": "Гарнир",
        "defaultValue": "Без гарнира",
        "options": [
          {
            "value": "Без гарнира",
            "label": "Без гарнира",
            "priceDelta": 0
          },
          {
            "value": "Рис 150 р.",
            "label": "Рис",
            "priceDelta": 150
          }
        ]
      }
    ],
    "variants": [
      {
        "id": "shrimp-orange-kimchi--860ba9de62064661",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Без гарнира"
        },
        "price": 790,
        "available": null
      },
      {
        "id": "shrimp-orange-kimchi--10c6f7aaf6bf67d6",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Рис 150 р."
        },
        "price": 940,
        "available": null
      }
    ],
    "defaultAttributes": {
      "option-0": "Без гарнира"
    },
    "priceFrom": true
  },
  {
    "id": "beef-black-pepper",
    "name": "Говядина в соусе черный перец",
    "category": "hot",
    "description": "Обжаренная говядина с овощами в соусе черный перец. С гарниром/без гарнира",
    "price": 790,
    "image": "./assets/beef-black-pepper.webp",
    "spicy": true,
    "popular": false,
    "sourceProductId": "1659016766062",
    "sourceRecordId": "rec373515503",
    "optionGroups": [
      {
        "id": "option-0",
        "label": "Гарнир",
        "defaultValue": "Без гарнира",
        "options": [
          {
            "value": "Без гарнира",
            "label": "Без гарнира",
            "priceDelta": 0
          },
          {
            "value": "Рис 150 р.",
            "label": "Рис",
            "priceDelta": 150
          }
        ]
      }
    ],
    "variants": [
      {
        "id": "beef-black-pepper--37a5cbb26f0ead1b",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Без гарнира"
        },
        "price": 790,
        "available": null
      },
      {
        "id": "beef-black-pepper--216e530c68ee389c",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Рис 150 р."
        },
        "price": 940,
        "available": null
      }
    ],
    "defaultAttributes": {
      "option-0": "Без гарнира"
    },
    "priceFrom": true
  },
  {
    "id": "chinese-chicken",
    "name": "Курица по-китайски",
    "category": "hot",
    "description": "Хрустящее куриное филе в соусе сладкий-чили. С гарниром/без гарнира",
    "price": 650,
    "image": "./assets/chinese-chicken.webp",
    "spicy": false,
    "popular": false,
    "sourceProductId": "1659017004954",
    "sourceRecordId": "rec373515503",
    "optionGroups": [
      {
        "id": "option-0",
        "label": "Гарнир",
        "defaultValue": "Без гарнира",
        "options": [
          {
            "value": "Без гарнира",
            "label": "Без гарнира",
            "priceDelta": 0
          },
          {
            "value": "Рис 150 р.",
            "label": "Рис",
            "priceDelta": 150
          }
        ]
      }
    ],
    "variants": [
      {
        "id": "chinese-chicken--8c01aaaf40ec802e",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Без гарнира"
        },
        "price": 650,
        "available": null
      },
      {
        "id": "chinese-chicken--f62819c13c9d1069",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Рис 150 р."
        },
        "price": 800,
        "available": null
      }
    ],
    "defaultAttributes": {
      "option-0": "Без гарнира"
    },
    "priceFrom": true
  },
  {
    "id": "thai-cashew-chicken",
    "name": "Курица по-тайски с кешью",
    "category": "hot",
    "description": "Хрустящее куриное филе, обжаренное с овощами и имбирем в остром соусе по-тайски. С гарниром/без гарнира",
    "price": 750,
    "image": "./assets/thai-cashew-chicken.webp",
    "spicy": true,
    "popular": false,
    "sourceProductId": "1659017077070",
    "sourceRecordId": "rec373515503",
    "optionGroups": [
      {
        "id": "option-0",
        "label": "Гарнир",
        "defaultValue": "Без гарнира",
        "options": [
          {
            "value": "Без гарнира",
            "label": "Без гарнира",
            "priceDelta": 0
          },
          {
            "value": "Рис 150 р.",
            "label": "Рис",
            "priceDelta": 150
          },
          {
            "value": "Брокколи по-азиатски WOK 350 р.",
            "label": "Брокколи по-азиатски WOK",
            "priceDelta": 350
          }
        ]
      }
    ],
    "variants": [
      {
        "id": "thai-cashew-chicken--dae9168bc59a61e8",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Без гарнира"
        },
        "price": 750,
        "available": null
      },
      {
        "id": "thai-cashew-chicken--02303d35292a54dd",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Рис 150 р."
        },
        "price": 900,
        "available": null
      },
      {
        "id": "thai-cashew-chicken--ecb1b1f68094bb9d",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Брокколи по-азиатски WOK 350 р."
        },
        "price": 1100,
        "available": null
      }
    ],
    "defaultAttributes": {
      "option-0": "Без гарнира"
    },
    "priceFrom": true
  },
  {
    "id": "chicken-teriyaki",
    "name": "Курица терияки",
    "category": "hot",
    "description": "Обжаренное куриное филе в соусе терияки. С гарниром/без гарнира",
    "price": 650,
    "image": "./assets/chicken-teriyaki.webp",
    "spicy": false,
    "popular": false,
    "sourceProductId": "1659017159479",
    "sourceRecordId": "rec373515503",
    "optionGroups": [
      {
        "id": "option-0",
        "label": "Гарнир",
        "defaultValue": "Без гарнира",
        "options": [
          {
            "value": "Без гарнира",
            "label": "Без гарнира",
            "priceDelta": 0
          },
          {
            "value": "Рис 150 р.",
            "label": "Рис",
            "priceDelta": 150
          }
        ]
      }
    ],
    "variants": [
      {
        "id": "chicken-teriyaki--9c77ffd0ba32e990",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Без гарнира"
        },
        "price": 650,
        "available": null
      },
      {
        "id": "chicken-teriyaki--c0ba69fea96a0225",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Рис 150 р."
        },
        "price": 800,
        "available": null
      }
    ],
    "defaultAttributes": {
      "option-0": "Без гарнира"
    },
    "priceFrom": true
  },
  {
    "id": "steamed-rice",
    "name": "Паровой рис",
    "category": "sides",
    "description": "",
    "price": 150,
    "image": "./assets/steamed-rice.webp",
    "spicy": false,
    "popular": false,
    "sourceProductId": "7873735193090",
    "sourceRecordId": "rec836273340"
  },
  {
    "id": "asian-broccoli",
    "name": "Брокколи по-азиатски",
    "category": "sides",
    "description": "Обжаренное на вок брокколи с азиатским соусом",
    "price": 350,
    "image": "./assets/asian-broccoli.webp",
    "spicy": false,
    "popular": false,
    "sourceProductId": "7873735193091",
    "sourceRecordId": "rec836273340"
  },
  {
    "id": "sauce",
    "name": "Порция соуса на выбор",
    "category": "sides",
    "description": "Порция соуса на выбор.",
    "price": 90,
    "image": "./assets/sauce.webp",
    "spicy": false,
    "popular": false,
    "priceFrom": false,
    "sourceProductId": "1733459904198",
    "sourceRecordId": "rec836273340",
    "optionGroups": [
      {
        "id": "option-0",
        "label": "Соус на выбор",
        "defaultValue": "Кетчуп",
        "options": [
          {
            "value": "Кетчуп",
            "label": "Кетчуп",
            "priceDelta": 0
          },
          {
            "value": "Кисло-сладкий",
            "label": "Кисло-сладкий",
            "priceDelta": 0
          },
          {
            "value": "Сладкий чили",
            "label": "Сладкий чили",
            "priceDelta": 0
          },
          {
            "value": "Lao GanMa (из соевых бобов)",
            "label": "Lao GanMa (из соевых бобов)",
            "priceDelta": 0
          },
          {
            "value": "Шри-Рача",
            "label": "Шри-Рача",
            "priceDelta": 0
          },
          {
            "value": "Спайси",
            "label": "Спайси",
            "priceDelta": 0
          },
          {
            "value": "Терияки",
            "label": "Терияки",
            "priceDelta": 0
          },
          {
            "value": "Соевый",
            "label": "Соевый",
            "priceDelta": 0
          },
          {
            "value": "Уксус с чили и чесноком",
            "label": "Уксус с чили и чесноком",
            "priceDelta": 0
          }
        ]
      }
    ],
    "variants": [
      {
        "id": "sauce--6189b5ba6f9a0fe1",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Кетчуп"
        },
        "price": 90,
        "available": null
      },
      {
        "id": "sauce--517e69ef01ca5e20",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Кисло-сладкий"
        },
        "price": 90,
        "available": null
      },
      {
        "id": "sauce--fa62f8b55e296489",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Сладкий чили"
        },
        "price": 90,
        "available": null
      },
      {
        "id": "sauce--b4610ae113782355",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Lao GanMa (из соевых бобов)"
        },
        "price": 90,
        "available": null
      },
      {
        "id": "sauce--089475df686c2bcd",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Шри-Рача"
        },
        "price": 90,
        "available": null
      },
      {
        "id": "sauce--0b9b13a5a6298e19",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Спайси"
        },
        "price": 90,
        "available": null
      },
      {
        "id": "sauce--1ff7e72135f0cae6",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Терияки"
        },
        "price": 90,
        "available": null
      },
      {
        "id": "sauce--db1f7cdb418205f0",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Соевый"
        },
        "price": 90,
        "available": null
      },
      {
        "id": "sauce--74fca6d65a001869",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Уксус с чили и чесноком"
        },
        "price": 90,
        "available": null
      }
    ],
    "defaultAttributes": {
      "option-0": "Кетчуп"
    }
  },
  {
    "id": "vietnamese-bananas",
    "name": "Бананы по-вьетнамски",
    "category": "desserts",
    "description": "Обжаренные бананы с карамельным соусом",
    "price": 290,
    "image": "./assets/vietnamese-bananas.webp",
    "spicy": false,
    "popular": false,
    "sourceProductId": "1516628799188",
    "sourceRecordId": "rec373519309"
  },
  {
    "id": "vietnamese-lemonade",
    "name": "Вьетнамский лимонад",
    "category": "drinks",
    "description": "Вьетнамские сокосодержащие лимонады Vinut (вкус на выбор) 300 мл.",
    "price": 190,
    "image": "./assets/vietnamese-lemonade.webp",
    "spicy": false,
    "popular": false,
    "sourceProductId": "1516628799188",
    "sourceRecordId": "rec373520909",
    "optionGroups": [
      {
        "id": "option-0",
        "label": "Вкус",
        "defaultValue": "Папайя",
        "options": [
          {
            "value": "Папайя",
            "label": "Папайя",
            "priceDelta": 0
          },
          {
            "value": "Личи",
            "label": "Личи",
            "priceDelta": 0
          },
          {
            "value": "Драгон фрут",
            "label": "Драгон фрут",
            "priceDelta": 0
          },
          {
            "value": "Мангустин",
            "label": "Мангустин",
            "priceDelta": 0
          }
        ]
      }
    ],
    "variants": [
      {
        "id": "vietnamese-lemonade--c38ffc6aeb51aa67",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Папайя"
        },
        "price": 190,
        "available": null
      },
      {
        "id": "vietnamese-lemonade--64439289925b13d9",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Личи"
        },
        "price": 190,
        "available": null
      },
      {
        "id": "vietnamese-lemonade--81839d3c9171f79a",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Драгон фрут"
        },
        "price": 190,
        "available": null
      },
      {
        "id": "vietnamese-lemonade--f0f7b4bea562c336",
        "sourceVariationId": null,
        "attributes": {
          "option-0": "Мангустин"
        },
        "price": 190,
        "available": null
      }
    ],
    "defaultAttributes": {
      "option-0": "Папайя"
    },
    "priceFrom": false
  }
];
