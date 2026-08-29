import type { StoryItem } from "./schemas";

export function markStoryResult(
  stories: StoryItem[],
  storyIndex: number,
  disposition: NonNullable<StoryItem["disposition"]>,
  time = "",
): StoryItem[] {
  const nextOrder = stories.reduce((highest, story) => Math.max(highest, story.actualOrder ?? -1), -1) + 1;
  return stories.map((story, index) => index === storyIndex ? {
    ...story,
    disposition,
    actualOrder: story.actualOrder ?? nextOrder,
    ...(disposition === "skipped"
      ? { actualStart: undefined, actualEnd: undefined }
      : time ? { actualStart: story.actualStart || time, actualEnd: time } : {}),
  } : story);
}

export function moveStoryInActualOrder(stories: StoryItem[], storyIndex: number, direction: -1 | 1): StoryItem[] {
  const targetIndex = storyIndex + direction;
  if (targetIndex < 0 || targetIndex >= stories.length) return stories;
  const reordered = [...stories];
  const [story] = reordered.splice(storyIndex, 1);
  reordered.splice(targetIndex, 0, story);
  return reordered.map((item, index) => ({ ...item, actualOrder: index }));
}

export function storyResultComplete(story: StoryItem): boolean {
  return story.disposition === "skipped" || Boolean(story.disposition && story.postSummary?.trim());
}
