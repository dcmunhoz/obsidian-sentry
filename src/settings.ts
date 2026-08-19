import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import SentryPlugin from './main';
import { Observable, Rule, SentrySettings, TargetValueType } from './types';

export const DEFAULT_SETTINGS: SentrySettings = {
	observables: [],
};

export class SentrySettingTab extends PluginSettingTab {
	plugin: SentryPlugin;

	constructor(app: App, plugin: SentryPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Observables')
			.setDesc('Configure actions to run when Obsidian events fire.')
			.addButton((button) =>
				button
					.setButtonText('Add observable')
					.setCta()
					.onClick(() => {
						this.plugin.settings.observables.push(createObservable());
						void this.plugin.saveSettings();
						this.display();
					}),
			);

		for (const observable of this.plugin.settings.observables) {
			this.renderObservable(containerEl, observable);
		}
	}

	private renderObservable(
		containerEl: HTMLElement,
		observable: Observable,
	): void {
		const details = containerEl.createEl('details', {
			cls: 'sentry-observable',
		});

		const summary = details.createEl('summary', {
			text: observable.name || 'Untitled observable',
			cls: 'sentry-summary',
		});

		new Setting(summary)
			.setName('')
			.addExtraButton((button) => {
				button.extraSettingsEl.addEventListener('click', (e) =>
					e.stopPropagation(),
				);
				button
					.setIcon('trash')
					.setTooltip('Remove observable')
					.onClick(() => {
						this.plugin.settings.observables =
							this.plugin.settings.observables.filter(
								(item) => item.id !== observable.id,
							);
						void this.plugin.saveSettings();
						this.display();
					});
			});

		new Setting(details)
			.setName('Name')
			.setDesc('A friendly name for this observable.')
			.addText((text) =>
				text
					.setPlaceholder('E.g. Book icon')
					.setValue(observable.name)
					.onChange((value) => {
						observable.name = value;
						if (summary.firstChild) {
							summary.firstChild.textContent =
								value || 'Untitled observable';
						}
					}),
			);

		new Setting(details)
			.setName('Event')
			.setDesc('The event to observe.')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('modify', 'Modify')
					.setValue(observable.event)
					.setDisabled(true),
			);

		new Setting(details)
			.setName('Observe')
			.setDesc('What to observe when the event fires.')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('property', 'Property')
					.setValue(observable.observe)
					.setDisabled(true),
			);

		new Setting(details)
			.setName('Property')
			.setDesc('The frontmatter property to observe.')
			.addText((text) =>
				text
					.setPlaceholder('E.g. Type')
					.setValue(observable.property)
					.onChange((value) => {
						observable.property = value;
					}),
			);

		new Setting(details)
			.setName('Rules')
			.setDesc('Actions to run when the observed property changes.')
			.addButton((button) =>
				button
					.setButtonText('Add rule')
					.onClick(() => {
						observable.rules.push(createRule());
						void this.plugin.saveSettings();
						this.renderRules(rulesContainer, observable);
					}),
			)
			.addExtraButton((button) =>
				button
					.setIcon('trash')
					.setTooltip('Remove observable')
					.onClick(() => {
						this.plugin.settings.observables =
							this.plugin.settings.observables.filter(
								(item) => item.id !== observable.id,
							);
						void this.plugin.saveSettings();
						this.display();
					}),
			);

		const rulesContainer = details.createDiv({ cls: 'sentry-rules' });

		this.renderRules(rulesContainer, observable);
	}

	private renderRules(
		containerEl: HTMLElement,
		observable: Observable,
	): void {
		containerEl.empty();
		for (const rule of observable.rules) {
			this.renderRule(containerEl, observable, rule, containerEl);
		}
	}

	private renderRule(
		containerEl: HTMLElement,
		observable: Observable,
		rule: Rule,
		rulesContainer: HTMLElement,
	): void {
		const details = containerEl.createEl('details', { cls: 'sentry-rule' });

		const summary = details.createEl('summary', {
			text: this.ruleSummary(rule),
			cls: 'sentry-summary',
		});

		new Setting(summary)
			.setName('')
			.addExtraButton((button) => {
				button.extraSettingsEl.addEventListener('click', (e) =>
					e.stopPropagation(),
				);
				button
					.setIcon('trash')
					.setTooltip('Remove rule')
					.onClick(() => {
						observable.rules = observable.rules.filter(
							(item) => item !== rule,
						);
						void this.plugin.saveSettings();
						this.renderRules(rulesContainer, observable);
					});
			});

		new Setting(details)
			.setName('Expected value')
			.setDesc('The value the observed property must become.')
			.addText((text) =>
				text
					.setPlaceholder('E.g. Book')
					.setValue(rule.expectedValue)
					.onChange((value) => {
						rule.expectedValue = value;
					}),
			);

		new Setting(details)
			.setName('Target property')
			.setDesc('The frontmatter property to modify.')
			.addText((text) =>
				text
					.setPlaceholder('E.g. Icon')
					.setValue(rule.targetProperty)
					.onChange((value) => {
						rule.targetProperty = value;
					}),
			);

		new Setting(details)
			.setName('Target value')
			.setDesc('The value to write into the target property.')
			.addText((text) =>
				text
					.setPlaceholder('E.g. 📖')
					.setValue(rule.targetValue)
					.onChange((value) => {
						rule.targetValue = value;
					}),
			);

		new Setting(details)
			.setName('Value type')
			.setDesc('How to interpret the target value.')
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(TARGET_TYPE_OPTIONS)
					.setValue(rule.targetType)
					.onChange((value) => {
						rule.targetType = value as TargetValueType;
					}),
			);

		new Setting(details)
			.setName('')
			.addButton((button) =>
				button
					.setButtonText('Save')
					.setCta()
					.onClick(async () => {
						if (!observable.name.trim()) {
							new Notice('Observable name is required.');
							return;
						}
						if (this.isDuplicateRule(observable, rule, rule.expectedValue, rule.targetProperty)) {
							new Notice('This rule already exists.');
							return;
						}
						await this.plugin.saveSettings();
						if (summary.firstChild) {
							summary.firstChild.textContent = this.ruleSummary(rule);
						}
						new Notice('Rule saved.');
					}),
			);
	}

	private ruleSummary(rule: Rule): string {
		const expected = rule.expectedValue || '?';
		const target = rule.targetProperty || '?';
		const value = rule.targetValue || '?';
		return `${expected} → ${target} = ${value}`;
	}

	private isDuplicateRule(
		currentObservable: Observable,
		currentRule: Rule,
		expectedValue: string,
		targetProperty: string,
	): boolean {
		for (const observable of this.plugin.settings.observables) {
			for (const rule of observable.rules) {
				if (rule === currentRule) {
					continue;
				}
				if (
					observable.property === currentObservable.property &&
					rule.expectedValue === expectedValue &&
					rule.targetProperty === targetProperty
				) {
					return true;
				}
			}
		}
		return false;
	}
}

const TARGET_TYPE_OPTIONS: Record<TargetValueType, string> = {
	text: 'Text',
	number: 'Number',
	boolean: 'Boolean',
	list: 'List (comma separated)',
};

function createObservable(): Observable {
	return {
		id: crypto.randomUUID(),
		name: '',
		event: 'modify',
		observe: 'property',
		property: '',
		rules: [],
	};
}

function createRule(): Rule {
	return {
		expectedValue: '',
		targetProperty: '',
		targetValue: '',
		targetType: 'text',
	};
}
