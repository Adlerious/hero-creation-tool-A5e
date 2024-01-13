import * as Utils from '../utils';
import { Step, StepEnum } from '../step';
import FixedOption, { OptionType } from '../options/fixedOption';
import DeletableOption from '../options/deletableOption';
import { SpellEntry, getSpellEntries } from '../indexes/indexUtils';
import { ClassSpellcastingData as ClassSpellcastingData } from './classStep';

const rules = { journalId: 'QvPDSUsAiEn3hD8s', pageId: 'evx9TWix4wYU51a5' };

class _Spells extends Step {
  constructor() {
    super(StepEnum.Spells);
  }

  section = () => $('#spellsDiv');

  $searchWrapper!: JQuery;
  $inputBox!: JQuery;
  $suggBox!: JQuery;
  $itemList!: JQuery;
  searchArray: SpellEntry[] = [];

  spells: SpellEntry[] = [];
  archived: SpellEntry[] = [];
  rules?: string;

  setListeners(): void {
    this.$searchWrapper = $('.hct-search-wrapper', this.section());
    this.$inputBox = $('input', this.$searchWrapper);
    this.$suggBox = $('[data-hct-searchbar-results]', this.$searchWrapper);
    this.$itemList = $('[data-hct-itemlist]', this.section());

    $('[data-hct-searchbar]', this.section()).on('submit', (event) => {
      if (this.searchArray.length == 1) {
        try {
          this.addItemToSelection(this.searchArray[0]);
          this.$inputBox.val('');
        } catch (error) {
          console.error(error);
          return false;
        }
      }
      return false;
    });

    $('[data-hct_spells_clear]', this.section()).on('click', () => {
      this.clearOptions();
      this.$itemList.empty();
      const deletedItems = this.archived.splice(0);
      this.spells.push(...deletedItems);
      $(`[data-hct_lv0_count]`, this.section()).html('0');
      $(`[data-hct_lv1_count]`, this.section()).html('0');
    });

    this.$inputBox.on('keyup', (e) => {
      const userData = (e.target as any).value;
      if (userData) {
        this.searchArray = this.spells.filter((data) => {
          return (data as any).name
            .toLocaleLowerCase()
            .replaceAll(/\s/g, '')
            .includes(userData.toLocaleLowerCase().replaceAll(/\s/g, ''));
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
    const item = this.spells.find((s) => s.name === itemName);
    if (!item) ui.notifications?.error(game.i18n.localize('HCT.Spells.SelectItemError'));
    this.addItemToSelection(item!);
    this.$inputBox.val('');
    this.$searchWrapper.removeClass('active');
  }

  addItemToSelection(item: SpellEntry) {
    const itemOption = new DeletableOption(
      StepEnum.Spells,
      new FixedOption(StepEnum.Spells, 'items', item, undefined, {
        addValues: true,
        type: OptionType.ITEM,
      }),
      { addValues: true },
      (id) => this.onDelete(item),
      item,
    );
    itemOption.render(this.$itemList);
    this.stepOptions.push(itemOption);

    //remove spell from the available list
    const removedItem = this.spells.splice(this.spells.indexOf(item), 1);
    this.archived.push(...removedItem);

    this.changeSpellCount(item.system.level, CountChange.UP);
  }

  onDelete(item: SpellEntry) {
    const deletedItem = this.archived.splice(this.archived.indexOf(item), 1);
    this.spells.push(...deletedItem);
    $(`:contains(${item.name})`, this.$itemList).remove();
    const optionToDelete = this.stepOptions.find((o) => {
      const deletable = o as DeletableOption;
      return deletable?.callbackParams === item;
    });
    if (optionToDelete) {
      this.stepOptions.splice(this.stepOptions.indexOf(optionToDelete), 1);
    }
    this.changeSpellCount(item.system.level, CountChange.DOWN);
  }

  showSuggestions(list: SpellEntry[]) {
    let listData;
    if (!list.length) {
      listData = `<li>${'No matches'}</li>`;
    } else {
      listData = list
        .map(
          (item: any) =>
            `<li><div class="hct-icon-with-context" data-item_name=\"${item.name}\"><img class="hct-icon-square-med hct-bg-black hct-border-0" src="${item.img}"><span>${item.name}</span></div></li>`,
        )
        .join('');
    }
    this.$suggBox.html(listData);
  }

  async setSourceData() {
    const spellIndexEntries = await getSpellEntries();
    const maxLevel = 9;
    this.spells = spellIndexEntries.filter((item) => item.system.level <= maxLevel);
  }

  changeSpellCount(spellLevel: number, change: CountChange) {
    const current = Number.parseInt($(`[data-hct_lv${spellLevel}_count]`, this.section()).html());
    const newVal = change === CountChange.UP ? current + 1 : current - 1;
    $(`[data-hct_lv${spellLevel}_count]`, this.section()).html(newVal.toString());
  }

  async renderData() {
    Utils.setPanelScrolls(this.section());
    // Show rules on the side panel
    const spellsRules = await Utils.getRules(rules);
    if (spellsRules) {
      //@ts-expect-error TextEditor TS def not updated yet
      this.rules = await TextEditor.enrichHTML(spellsRules.content, { async: true });
      $('[data-hct_spells_description]', this.section()).html(this.rules);
    }
  }

  update(data: any) {
    const $spellCastingAbilityElem = $('[data-hct_spellcasting_ability]', this.section());
    const $sidePanel = $('[data-hct_spells_description]', this.section());

    if (!data.class?.spellcasting) {
      $spellCastingAbilityElem.html(game.i18n.localize('HCT.Spells.NoSpellcastingClass'));
      $sidePanel.html(this.rules ?? '');
      return;
    }
    const classSpellcasting = data.class.spellcasting as ClassSpellcastingData;
    const spa = (game as any).dnd5e.config.abilities[classSpellcasting.ability].label;

    $spellCastingAbilityElem.html(
      game.i18n.format('HCT.Spells.SpellcastingAbilityBlob', { class: data.class.name, spa: spa }),
    );
  }
}
const SpellsTab: Step = new _Spells();
export default SpellsTab;

const enum CountChange {
  UP,
  DOWN,
}
