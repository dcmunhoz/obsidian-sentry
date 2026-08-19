import { FileManager, MetadataCache, TFile } from 'obsidian';
import { Rule, SentrySettings } from './types';
import {
	convertValue,
	getFrontmatterValue,
	valuesEqual,
} from './utils/frontmatter';

export class Observer {
	private snapshots = new Map<string, Record<string, unknown>>();
	private rulesByProperty = new Map<string, Rule[]>();

	constructor(
		private metadataCache: MetadataCache,
		private fileManager: FileManager,
		private getSettings: () => SentrySettings,
	) {}

	captureSnapshot(file: TFile): void {
		if (file.extension !== 'md') {
			return;
		}
		const cache = this.metadataCache.getFileCache(file);
		this.snapshots.set(file.path, cache?.frontmatter ?? {});
	}

	rebuildIndex(): void {
		this.rulesByProperty.clear();
		for (const observable of this.getSettings().observables) {
			if (observable.event !== 'modify' || observable.observe !== 'property') {
				continue;
			}
			const rules = this.rulesByProperty.get(observable.property) ?? [];
			rules.push(...observable.rules);
			this.rulesByProperty.set(observable.property, rules);
		}
	}

	handleChanged(file: TFile, _data: string, cache: CachedMetadataLike): void {
		if (file.extension !== 'md') {
			return;
		}

		const newFrontmatter = cache?.frontmatter ?? {};
		const previousFrontmatter = this.snapshots.get(file.path);

		if (previousFrontmatter) {
			this.applyRules(file, previousFrontmatter, newFrontmatter);
		}

		this.snapshots.set(file.path, newFrontmatter);
	}

	private applyRules(
		file: TFile,
		previousFrontmatter: Record<string, unknown>,
		newFrontmatter: Record<string, unknown>,
	): void {
		const changedProperties = this.findChangedProperties(
			previousFrontmatter,
			newFrontmatter,
		);

		for (const property of changedProperties) {
			const rules = this.rulesByProperty.get(property);
			if (!rules || rules.length === 0) {
				continue;
			}

			const newValue = getFrontmatterValue(newFrontmatter, property);
			const matched = rules.filter(
				(rule) => String(newValue) === rule.expectedValue,
			);
			const unmatched = rules.filter(
				(rule) => String(newValue) !== rule.expectedValue && !matched.map(m => m.targetProperty).contains(rule.targetProperty),
			); 

			for (const rule of matched) {
				void this.writeRule(file, rule);
			}

			const targetsToClear = [...new Set(unmatched.map((rule) => rule.targetProperty))];
			for (const target of targetsToClear) {
				void this.clearRule(file, target);
			}
		}
	}

	private findChangedProperties(
		previousFrontmatter: Record<string, unknown>,
		newFrontmatter: Record<string, unknown>,
	): string[] {
		const properties = new Set([
			...Object.keys(previousFrontmatter),
			...Object.keys(newFrontmatter),
		]);
		const changed: string[] = [];
		for (const property of properties) {
			const prev = getFrontmatterValue(previousFrontmatter, property);
			const next = getFrontmatterValue(newFrontmatter, property);
			if (!valuesEqual(prev, next)) {
				changed.push(property);
			}
		}
		return changed;
	}

	private async writeRule(file: TFile, rule: Rule): Promise<void> {
		const converted = convertValue(rule.targetValue, rule.targetType);
		await this.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
			frontmatter[rule.targetProperty] = converted;
		});
	}

	private async clearRule(file: TFile, targetProperty: string): Promise<void> {
		await this.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
			frontmatter[targetProperty] = '';
		});
	}
}

interface CachedMetadataLike {
	frontmatter?: Record<string, unknown>;
}
