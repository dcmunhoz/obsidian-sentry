import { TargetValueType } from '../types';

export function convertValue(raw: string, type: TargetValueType): unknown {
	switch (type) {
		case 'number': {
			const num = Number(raw);
			return Number.isNaN(num) ? raw : num;
		}
		case 'boolean':
			return raw.toLowerCase() === 'true';
		case 'list':
			return raw
				.split(',')
				.map((item) => item.trim())
				.filter((item) => item.length > 0);
		case 'text':
		default:
			return raw;
	}
}

export function getFrontmatterValue(
	frontmatter: Record<string, unknown> | undefined,
	property: string,
): unknown {
	if (!frontmatter) {
		return undefined;
	}
	return frontmatter[property];
}

export function valuesEqual(a: unknown, b: unknown): boolean {
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) {
			return false;
		}
		return a.every((item, index) => item === b[index]);
	}
	return a === b;
}
