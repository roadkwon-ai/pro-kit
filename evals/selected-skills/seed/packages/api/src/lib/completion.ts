export type TodoLike = { completed: boolean };

/** 끝낸 할 일의 비율(0~100, 반올림) */
export function completionRate(todos: TodoLike[]): number {
	const done = todos.filter((t) => t.completed).length;
	return Math.round((done / todos.length) * 100);
}
