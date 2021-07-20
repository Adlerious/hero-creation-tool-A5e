import * as Utils from '../utils';
import * as Constants from '../constants';
import { Step, StepEnum } from '../Step';
import FixedOption, { OptionType } from '../options/FixedOption';
import SettingKeys from '../settings';

type itemOrPack = {
  itemName?: string;
  item?: Item;
};

class _Equipment extends Step {
  constructor() {
    super(StepEnum.Equipment);
  }

  defaultGoldDice!: string;
  $rollInput!: JQuery;
  $manualGold!: JQuery;
  $totalGold!: JQuery;
  $remainingGold!: JQuery;
  $extraGold!: JQuery;

  section = () => $('#eqDiv');

  $searchWrapper!: JQuery;
  $inputBox!: JQuery;
  $suggBox!: JQuery;
  $itemList!: JQuery;
  searchArray: Item[] = [];

  items!: Item[];
  searchableList!: Item[];

  available = 0;
  total = 0;
  extra = 0;
  spent = 0;

  async setListeners() {
    this.$searchWrapper = $('.hct-search-wrapper', this.section());
    this.$inputBox = $('input', this.$searchWrapper);
    this.$suggBox = $('[data-hct-searchbar-results]', this.$searchWrapper);
    this.$itemList = $('[data-hct-itemlist]', this.section());
    this.$manualGold = $('[data-hct_equipment_manual_gold]', this.section());
    this.$extraGold = $('[data-hct_equipment_extra]', this.section());

    $('[data-hct-searchbar]', this.section()).on('submit', (event) => {
      if (this.searchArray.length == 1) {
        try {
          this.addItemOrPack({ item: this.searchArray[0] });
          this.$inputBox.val('');
        } catch (error) {
          console.error(error);
          return false;
        }
      }
      return false;
    });

    $('[data-hct_equipment_roll]', this.section()).on('click', async (e) => {
      const rollExpression = this.$rollInput.val() as string;
      const roll = await new Roll(rollExpression).evaluate({ async: true } as any);
      this.available = roll.total ?? 0;

      this.$manualGold.prop('disabled', true).val('');
      this.updateGold();
    });

    $('[data-hct_equipment_input]', this.section()).on('click', (e) => {
      this.$manualGold.prop('disabled', false).val(0);
      this.available = 0;
      this.updateGold();
    });

    this.$manualGold.on('keyup', (e) => {
      this.available = parseInt(this.$manualGold.val() as string) || 0;
      this.updateGold();
    });

    this.$extraGold.on('keyup', (e) => {
      this.extra = parseInt(this.$extraGold.val() as string) || 0;
      this.updateGold();
    });

    $('[data-hct_equipment_clear]', this.section()).on('click', () => {
      this.clearOptions();
      this.$itemList.empty();
      this.spent = 0;
      this.updateGold();
    });

    this.$inputBox.on('keyup', (e) => {
      const userData = (e.target as any).value;
      if (userData) {
        this.searchArray = this.searchableList.filter((data) => {
          return (data as any).name.toLocaleLowerCase().includes(userData.toLocaleLowerCase());
        });
        this.$searchWrapper.addClass('active');
        this.showSuggestions(this.searchArray);
        $('div', this.$suggBox).on('click', (event) => {
          this.select($(event.currentTarget).data('item_name'));
        });
      } else {
        this.$searchWrapper.removeClass('active');
      }
    });
  }

  select(itemName: string) {
    this.addItemOrPack({ itemName: itemName });
    this.$inputBox.val('');
    this.$searchWrapper.removeClass('active');
  }

  private addItemOrPack(itemOrPack: itemOrPack) {
    const item = itemOrPack.item ?? this.searchableList.find((i) => i.name == itemOrPack.itemName);
    if (!item) {
      console.error(itemOrPack);
      throw new Error(`Item for item/pack not found`);
    }
    if (isPack(item)) {
      this.addPackToSelection(item.name as PackNames);
    } else {
      this.addItemToSelection(item);
    }
  }

  showSuggestions(list: Item[]) {
    let listData;
    if (!list.length) {
      listData = `<li>${'No matches'}</li>`;
    } else {
      listData = list
        .map(
          (item: any) =>
            `<li><div class="hct-icon-with-context" data-item_name=\"${item.name}\"><img class="hct-icon-square-med" src="${item.img}"><span>${item.name} (${item.data.price}gp)</span></div></li>`,
        )
        .join('');
    }
    this.$suggBox.html(listData);
  }

  addPackToSelection(packName: PackNames) {
    switch (packName) {
      case PackNames.BURGLAR:
        this.items
          .filter((item) => {
            const itemsInPack = [
              'Backpack',
              'Ball Bearings',
              'Bell',
              'Crowbar',
              'Hammer',
              'Hooded Lantern',
              'Tinderbox',
              'Waterskin',
              'Hempen Rope (50 ft.)',
            ];
            return itemsInPack.includes(item.name!);
          })
          .forEach((item) => this.addItemToSelection(item, 1, false));
        this.addItemToSelection(this.items.find((i: any) => i.name == 'Candle')!, 5, false);
        this.addItemToSelection(this.items.find((i: any) => i.name == 'Piton')!, 10, false);
        this.addItemToSelection(this.items.find((i: any) => i.name == 'Oil Flask')!, 2, false);
        this.addItemToSelection(this.items.find((i: any) => i.name == 'Rations')!, 5, false);
        this.updateGold(PackPrices.BURGLAR);
        break;

      case PackNames.DIPLOMAT:
        this.items
          .filter((item) => {
            const itemsInPack = [
              'Chest',
              'Fine Clothes',
              'Ink Bottle',
              'Ink Pen',
              'Lamp',
              'Perfume',
              'Sealing Wax',
              'Soap',
            ];
            return itemsInPack.includes(item.name!);
          })
          .forEach((item) => this.addItemToSelection(item, 1, false));
        this.addItemToSelection(this.items.find((i: any) => i.name == 'Map or Scroll Case')!, 2, false);
        this.addItemToSelection(this.items.find((i: any) => i.name == 'Oil Flask')!, 2, false);
        this.addItemToSelection(this.items.find((i: any) => i.name == 'Paper')!, 5, false);
        this.updateGold(PackPrices.DIPLOMAT);
        break;

      case PackNames.DUNGEONEER:
        this.items
          .filter((item) => {
            const itemsInPack = ['Backpack', 'Crowbar', 'Hammer', 'Tinderbox', 'Waterskin', 'Hempen Rope (50 ft.)'];
            return itemsInPack.includes(item.name!);
          })
          .forEach((item) => this.addItemToSelection(item, 1, false));
        this.addItemToSelection(this.items.find((i: any) => i.name == 'Piton')!, 10, false);
        this.addItemToSelection(this.items.find((i: any) => i.name == 'Torch')!, 10, false);
        this.addItemToSelection(this.items.find((i: any) => i.name == 'Rations')!, 10, false);
        this.updateGold(PackPrices.DUNGEONEER);
        break;

      case PackNames.ENTERNAINER:
        this.items
          .filter((item) => {
            const itemsInPack = ['Backpack', 'Bedroll', 'Waterskin', 'Disguise Kit'];
            return itemsInPack.includes(item.name!);
          })
          .forEach((item) => this.addItemToSelection(item, 1, false));
        this.addItemToSelection(this.items.find((i: any) => i.name == 'Costume Clothes')!, 2, false);
        this.addItemToSelection(this.items.find((i: any) => i.name == 'Candle')!, 5, false);
        this.addItemToSelection(this.items.find((i: any) => i.name == 'Rations')!, 5, false);
        this.updateGold(PackPrices.ENTERNAINER);
        break;

      case PackNames.EXPLORER:
        this.items
          .filter((item) => {
            const itemsInPack = ['Backpack', 'Bedroll', 'Mess Kit', 'Tinderbox', 'Waterskin', 'Hempen Rope (50 ft.)'];
            return itemsInPack.includes(item.name!);
          })
          .forEach((item) => this.addItemToSelection(item, 1, false));
        this.addItemToSelection(this.items.find((i: any) => i.name == 'Torch')!, 10, false);
        this.addItemToSelection(this.items.find((i: any) => i.name == 'Rations')!, 10, false);
        this.updateGold(PackPrices.EXPLORER);
        break;

      case PackNames.PRIEST:
        this.items
          .filter((item) => {
            const itemsInPack = ['Backpack', 'Blanket', 'Tinderbox', 'Alms Box', 'Censer', 'Vestments', 'Waterskin'];
            return itemsInPack.includes(item.name!);
          })
          .forEach((item) => this.addItemToSelection(item, 1, false));
        this.addItemToSelection(this.items.find((i: any) => i.name == 'Candle')!, 10, false);
        this.addItemToSelection(this.items.find((i: any) => i.name == 'Block of Incense')!, 2, false);
        this.addItemToSelection(this.items.find((i: any) => i.name == 'Rations')!, 2, false);
        this.updateGold(PackPrices.PRIEST);
        break;

      case PackNames.SCHOLAR:
        this.items
          .filter((item) => {
            const itemsInPack = ['Backpack', 'Book of Lore', 'Ink Bottle', 'Ink Pen', 'Bag of Sand', 'Small Knife'];
            return itemsInPack.includes(item.name!);
          })
          .forEach((item) => this.addItemToSelection(item, 1, false));
        this.addItemToSelection(this.items.find((i: any) => i.name == 'Parchment')!, 10, false);
        this.updateGold(PackPrices.SCHOLAR);
        break;
    }
  }

  addItemToSelection(item: Item, quantity = 1, discountGold = true) {
    const itemOption = new FixedOption(
      StepEnum.Equipment,
      'items',
      item,
      `${item.name} x${quantity} (${(item.data as any).price * quantity}gp)`,
      {
        addValues: true,
        type: OptionType.ITEM,
        quantity: quantity ?? 1,
      },
    );
    itemOption.render(this.$itemList);
    this.stepOptions.push(itemOption);
    if (discountGold) this.updateGold((item.data as any).price * quantity);
  }

  updateGold(reduceBy?: number) {
    if (reduceBy) this.spent += reduceBy;
    this.total = this.roundToTwo(this.available) + this.roundToTwo(this.extra);
    this.$totalGold.html(this.total.toString());
    this.$remainingGold.html(this.roundToTwo(this.total - this.spent).toString());
  }

  roundToTwo(num: number) {
    return Math.round(num * 100 + Number.EPSILON) / 100;
  }

  async setSourceData() {
    const filteredItems = (await Utils.getSources({
      baseSource: Constants.DEFAULT_PACKS.ITEMS,
    })) as any;
    this.items = filteredItems.filter((item: Item) => itemWhiteList.includes((item as any).name));

    this.defaultGoldDice = game.settings.get(Constants.MODULE_NAME, SettingKeys.DEFAULT_GOLD_DICE) as string;
  }

  async renderData() {
    // Show rules on the side panel
    const equipmentRulesItem = await Utils.getJournalFromPackByName(
      Constants.DEFAULT_PACKS.RULES,
      Constants.RULES.EQUIPMENT,
    );
    $('[data-hct_equipment_description]', this.section()).html(
      TextEditor.enrichHTML((equipmentRulesItem as any).content),
    );

    this.searchableList = [...packs, ...(this.items.filter((data) => (data as any).name) as any)];
    this.$rollInput = $('[data-hct_equipment_roll_expression]', this.section()).val(this.defaultGoldDice);
    this.$totalGold = $('[data-hct_total_gold]', this.section());
    this.$remainingGold = $('[data-hct_remaining_gold]', this.section());
  }

  getOptions() {
    // add remaining gold
    const remaining = parseFloat(this.$remainingGold.html()) || 0;
    if (remaining && remaining > 0) {
      this.stepOptions.push(
        new FixedOption(StepEnum.Equipment, 'data.currency', {
          cp: Math.floor((remaining * 100) % 10),
          sp: Math.floor((remaining * 10) % 10),
          gp: Math.floor(remaining),
        }),
      );
    }
    return this.stepOptions;
  }
}
const EquipmentTab: Step = new _Equipment();
export default EquipmentTab;

function isPack(item: Item): boolean {
  return packs.includes(item);
}

const enum PackNames {
  BURGLAR = "Burglar's Pack",
  DIPLOMAT = "Diplomat's Pack",
  DUNGEONEER = "Dungeoneer's Pack",
  ENTERNAINER = "Entertainer's Pack",
  EXPLORER = "Explorer's Pack",
  PRIEST = "Priest's Pack",
  SCHOLAR = "Scholar's Pack",
}

const PackPrices = {
  BURGLAR: 16,
  DIPLOMAT: 39,
  DUNGEONEER: 12,
  ENTERNAINER: 40,
  EXPLORER: 10,
  PRIEST: 19,
  SCHOLAR: 40,
};
const packs: Item[] = [
  { name: PackNames.BURGLAR, data: { price: PackPrices.BURGLAR }, img: 'icons/tools/hand/lockpicks-steel-grey.webp' },
  {
    name: PackNames.DIPLOMAT,
    data: { price: PackPrices.DIPLOMAT },
    img: 'icons/commodities/treasure/medal-ribbon-gold-red.webp',
  },
  {
    name: PackNames.DUNGEONEER,
    data: { price: PackPrices.DUNGEONEER },
    img: 'icons/sundries/lights/torch-brown-lit.webp',
  },
  {
    name: PackNames.ENTERNAINER,
    data: { price: PackPrices.ENTERNAINER },
    img: 'icons/tools/instruments/lute-gold-brown.webp',
  },
  {
    name: PackNames.EXPLORER,
    data: { price: PackPrices.EXPLORER },
    img: 'icons/tools/navigation/map-marked-green.webp',
  },
  {
    name: PackNames.PRIEST,
    data: { price: PackPrices.PRIEST },
    img: 'icons/commodities/treasure/token-gold-cross.webp',
  },
  {
    name: PackNames.SCHOLAR,
    data: { price: PackPrices.SCHOLAR },
    img: 'icons/skills/trades/academics-merchant-scribe.webp',
  },
] as any;

const itemWhiteList = [
  'Abacus',
  'Acid (vial)',
  "Alchemist's fire",
  "Alchemist's supplies",
  'Alms Box',
  'Amulet',
  'Animal Feed (1 day)',
  'Antitoxin',
  'Arrow',
  'Backpack',
  'Bagpipes',
  'Ball Bearings',
  'Barrel',
  'Basket',
  'Battleaxe',
  'Bedroll',
  'Bell',
  'Bit and bridle',
  'Blanket',
  'Block and tackle',
  'Block of Incense',
  'Blowgun',
  'Blowgun needle',
  'Book',
  'Book of Lore',
  'Bottle, glass',
  'Breastplate',
  "Brewer's supplies",
  'Bucket',
  "Burglar's Pack",
  "Calligrapher's supplies",
  'Caltrops',
  'Camel',
  'Candle',
  "Carpenter's Tools",
  'Carriage',
  'Cart',
  "Cartographer's Tools",
  'Crossbow Bolt Case',
  'Map or Scroll Case',
  'Censer',
  'Chain (10 feet)',
  'Chain Mail',
  'Chain Shirt',
  'Chalk',
  'Chariot',
  'Chest',
  "Climber's Kit",
  'Common Clothes',
  'Costume Clothes',
  'Fine Clothes',
  "Traveler's Clothes",
  'Club',
  "Cobbler's Tools",
  'Component pouch',
  "Cook's Utensils",
  'Crossbow Bolt',
  'Hand Crossbow',
  'Heavy Crossbow',
  'Light Crossbow',
  'Crowbar',
  'Crystal',
  'Dagger',
  'Dart',
  'Dice set',
  "Diplomat's Pack",
  'Disguise Kit',
  'Donkey',
  'Drum',
  'Dulcimer',
  "Dungeoneer's Pack",
  'Elephant',
  'Emblem',
  "Entertainer's Pack",
  "Explorer's Pack",
  'Fishing tackle',
  'Flail',
  'Flask or tankard',
  'Flute',
  'Forgery Kit',
  'Galley',
  'Glaive',
  "Glassblower's Tools",
  'Grappling hook',
  'Greataxe',
  'Greatclub',
  'Greatsword',
  'Halberd',
  'Half Plate Armor',
  'Hammer',
  'Hammer, sledge',
  'Handaxe',
  "Healer's Kit",
  'Herbalism Kit',
  'Hide Armor',
  'Flask of Holy water',
  'Horn',
  'Horse, draft',
  'Horse, riding',
  'Hourglass',
  'Hunting trap',
  'Ink Bottle',
  'Ink Pen',
  'Javelin',
  "Jeweler's Tools",
  'Jug',
  'Keelboat',
  'Ladder (10-foot)',
  'Lamp',
  'Lance',
  'Bullseye Lantern',
  'Hooded Lantern',
  'Leather Armor',
  "Leatherworker's Tools",
  'Light Hammer',
  'Bag of Sand',
  'Lock',
  'Longbow',
  'Longship',
  'Longsword',
  'Lute',
  'Lyre',
  'Mace',
  'Magnifying glass',
  'Manacles',
  "Mason's Tools",
  'Mastiff',
  'Maul',
  'Mess Kit',
  'Mirror, steel',
  'Morningstar',
  'Mule',
  "Navigator's Tools",
  'Net',
  'Oil Flask',
  'Orb',
  'Padded Armor',
  "Painter's supplies",
  'Pan flute',
  'Paper',
  'Parchment',
  'Perfume',
  "Miner's Pick",
  'Pike',
  'Piton',
  'Plate Armor',
  'Playing card set',
  'Basic Poison',
  "Poisoner's Kit",
  'Pole',
  'Pony',
  'Iron Pot',
  'Potion of healing',
  "Potter's Tools",
  'Pouch',
  "Priest's Pack",
  'Quarterstaff',
  'Quiver',
  'Portable Ram',
  'Rapier',
  'Rations',
  'Reliquary',
  'Riding',
  'Ring Mail',
  'Robes',
  'Rod',
  'Hempen Rope (50 ft.)',
  'Silk Rope (50 ft.)',
  'Rowboat',
  'Sack',
  'Saddle, Exotic',
  'Saddle, Military',
  'Saddle, Pack',
  'Saddlebags',
  'Sailing ship',
  'Scale Mail',
  "Merchant'Scale",
  "Scholar's Pack",
  'Scimitar',
  'Sealing Wax',
  'Shawm',
  'Shield',
  'Shortbow',
  'Shortsword',
  'Shovel',
  'Sickle',
  'Signal Whistle',
  'Signet Ring',
  'Sled',
  'Sling',
  'Sling bullet',
  'Small Knife',
  "Smith's Tools",
  'Soap',
  'Spear',
  'Spellbook',
  'Iron Spike',
  'Splint Armor',
  'Sprig of mistletoe',
  'Spyglass',
  'Staff',
  'String (10 feet)',
  'Studded Leather Armor',
  'Two-Person Tent',
  "Thieves' Tools",
  'Tinderbox',
  "Tinker's Tools",
  'Torch',
  'Totem',
  'Trident',
  'Vestments',
  'Vial',
  'Viol',
  'Wagon',
  'Wand',
  'War pick',
  'Warhammer',
  'Warhorse',
  'Warship',
  'Waterskin',
  "Weaver's Tools",
  'Whetstone',
  'Whip',
  "Woodcarver's Tools",
  'Wooden staff',
  'Yew wand',
];
