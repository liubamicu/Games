import random
from enum import Enum

GRID_WIDTH = 20
GRID_HEIGHT = 20


class Direction(str, Enum):
    UP = "UP"
    DOWN = "DOWN"
    LEFT = "LEFT"
    RIGHT = "RIGHT"


OPPOSITES = {
    Direction.UP: Direction.DOWN,
    Direction.DOWN: Direction.UP,
    Direction.LEFT: Direction.RIGHT,
    Direction.RIGHT: Direction.LEFT,
}


class SnakeGame:
    def __init__(self):
        self.reset()

    def reset(self):
        mid_x = GRID_WIDTH // 2
        mid_y = GRID_HEIGHT // 2
        self.snake = [[mid_x, mid_y], [mid_x - 1, mid_y], [mid_x - 2, mid_y]]
        self.direction = Direction.RIGHT
        self.next_direction = Direction.RIGHT
        self.score = 0
        self.game_over = False
        self.food = self._spawn_food()

    def _spawn_food(self):
        while True:
            pos = [random.randint(0, GRID_WIDTH - 1), random.randint(0, GRID_HEIGHT - 1)]
            if pos not in self.snake:
                return pos

    def set_direction(self, new_dir: Direction):
        # Ignore reversal; buffer one direction change per tick
        if new_dir != OPPOSITES.get(self.direction):
            self.next_direction = new_dir

    def tick(self):
        if self.game_over:
            return

        self.direction = self.next_direction
        head = self.snake[0]

        dx, dy = {
            Direction.UP:    (0, -1),
            Direction.DOWN:  (0,  1),
            Direction.LEFT:  (-1, 0),
            Direction.RIGHT: (1,  0),
        }[self.direction]

        new_head = [head[0] + dx, head[1] + dy]

        # Wall collision
        if not (0 <= new_head[0] < GRID_WIDTH and 0 <= new_head[1] < GRID_HEIGHT):
            self.game_over = True
            return

        # Self collision
        if new_head in self.snake:
            self.game_over = True
            return

        self.snake.insert(0, new_head)

        if new_head == self.food:
            self.score += 10
            self.food = self._spawn_food()
        else:
            self.snake.pop()

    def state(self):
        return {
            "snake": self.snake,
            "food": self.food,
            "score": self.score,
            "game_over": self.game_over,
            "grid_width": GRID_WIDTH,
            "grid_height": GRID_HEIGHT,
        }
