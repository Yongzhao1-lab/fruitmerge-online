# game.py
"""
Game manager class for Merge Fruit Game containing state machine,
custom circle-impulse physics engine, game boundaries, and high scores.
"""

import pygame
import random
import os
import math
from fruit import Fruit
from settings import (
    SCREEN_WIDTH, SCREEN_HEIGHT, GAME_WIDTH, GAME_HEIGHT, GAME_X, GAME_Y,
    LEFT_BOUND, RIGHT_BOUND, BOTTOM_BOUND, DEADLINE_Y,
    COLOR_BG, COLOR_CONTAINER_BG, COLOR_CONTAINER_BORDER, COLOR_DEADLINE,
    COLOR_TEXT_MAIN, COLOR_TEXT_MUTED, COLOR_CARD_BG,
    FRUIT_TYPES, MAX_DROP_FRUIT_ID, HIGH_SCORE_FILE, FPS
)

class Game:
    def __init__(self):
        self.score = 0
        self.high_score = self.load_high_score()
        self.fruits = []
        
        # Next fruits preview mechanism
        self.current_id = random.randint(1, MAX_DROP_FRUIT_ID)
        self.next_id = random.randint(1, MAX_DROP_FRUIT_ID)
        
        self.held_fruit = None
        self.reset_held_fruit()
        
        self.game_over = False
        self.cooldown_timer = 0  # To prevent rapid clicking
        self.cooldown_duration = 35  # Frames (approx 0.6s at 60 FPS)
        
        self.deadline_warning_timer = 0
        self.max_deadline_warning_frames = 100 # Approx 1.6s warning
        self.show_warning_line = False
        
        # Audio setup
        self.sounds = {}
        self.init_sounds()
        
    def init_sounds(self):
        """Prepares Pygame sound mixers. Gracefully defaults to silent if audio hardware is absent."""
        try:
            pygame.mixer.init()
            # Since real sound files may not be present in the workspace, we prepare.
            # If the user place real sound files, they will bind.
            self.sound_enabled = True
        except Exception:
            self.sound_enabled = False
            
    def play_sound(self, sound_type):
        """Placeholder sound trigger. Safely catches any loader errors."""
        if not self.sound_enabled:
            return
        # If files existed, we would play them here.
        # e.g., pygame.mixer.Sound("assets/merge.wav").play()
        pass

    def load_high_score(self):
        if os.path.exists(HIGH_SCORE_FILE):
            try:
                with open(HIGH_SCORE_FILE, "r") as f:
                    return int(f.read().strip())
            except Exception:
                return 0
        return 0
        
    def save_high_score(self):
        try:
            with open(HIGH_SCORE_FILE, "w") as f:
                f.write(str(self.high_score))
        except Exception:
            pass

    def reset_held_fruit(self):
        """Creates a fruit on the shooter rail at top."""
        if self.game_over:
            return
        # Position fruit at middle coordinate above deadline
        self.held_fruit = Fruit((LEFT_BOUND + RIGHT_BOUND) // 2, DEADLINE_Y - 30, self.current_id, is_dropped=False)

    def select_next_fruits(self):
        self.current_id = self.next_id
        self.next_id = random.randint(1, MAX_DROP_FRUIT_ID)

    def handle_input(self, event):
        if self.game_over:
            # Check for restart button click during game over
            if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                mx, my = pygame.mouse.get_pos()
                # Restart button bounds relative to game over pop-up
                btn_left = SCREEN_WIDTH // 2 - 80
                btn_top = SCREEN_HEIGHT // 2 + 30
                btn_width = 160
                btn_height = 45
                if btn_left <= mx <= btn_left + btn_width and btn_top <= my <= btn_top + btn_height:
                    self.restart()
            return
            
        if event.type == pygame.MOUSEMOTION:
            # Track mouse X but clamp to wall boundaries
            mx, _ = pygame.mouse.get_pos()
            if self.held_fruit:
                r = self.held_fruit.radius
                clamp_left = LEFT_BOUND + r + 5
                clamp_right = RIGHT_BOUND - r - 5
                new_x = max(clamp_left, min(mx, clamp_right))
                self.held_fruit.x = new_x
                
        elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if self.held_fruit and self.cooldown_timer == 0:
                # Drop!
                self.held_fruit.is_dropped = True
                self.fruits.append(self.held_fruit)
                self.held_fruit = None
                
                # Start spawn cooldown
                self.cooldown_timer = self.cooldown_duration
                self.select_next_fruits()
                self.play_sound("drop")
                
    def restart(self):
        self.score = 0
        self.fruits = []
        self.game_over = False
        self.cooldown_timer = 0
        self.deadline_warning_timer = 0
        self.show_warning_line = False
        self.current_id = random.randint(1, MAX_DROP_FRUIT_ID)
        self.next_id = random.randint(1, MAX_DROP_FRUIT_ID)
        self.reset_held_fruit()

    def merge_fruits(self, f1, f2):
        if f1.inactive or f2.inactive:
            return
        f1.inactive = True
        f2.inactive = True
        
        # Merge location: mid point between fruit 1 and 2
        mid_x = (f1.x + f2.x) / 2.0
        mid_y = (f1.y + f2.y) / 2.0
        
        next_type = f1.id + 1
        
        # Award points based on the merging types
        self.score += FRUIT_TYPES[f1.id]["score"]
        if self.score > self.high_score:
            self.high_score = self.score
            self.save_high_score()
            
        # Spawn next tier if not already Max/Watermelon
        if next_type in FRUIT_TYPES:
            new_f = Fruit(mid_x, mid_y, next_type, is_dropped=True)
            # Add a small merge velocity boost
            new_f.vx = random.uniform(-0.5, 0.5)
            new_f.vy = -1.2 # Slid up slightly
            self.fruits.append(new_f)
            self.play_sound("merge")
        else:
            # Reached final tier (Watermelon + Watermelon) -> clean them and reward bonus!
            self.score += 100
            self.play_sound("suika")

    def resolve_collisions(self):
        """Rigid circle impulse solver to bounce, separate overlaps, and roll fruits precisely."""
        n = len(self.fruits)
        # Multiple loops ensure stability of stacked circle physics (Jacobi/Gauss-Seidel approach)
        for _ in range(4):
            for i in range(n):
                for j in range(i + 1, n):
                    f1 = self.fruits[i]
                    f2 = self.fruits[j]
                    
                    if f1.inactive or f2.inactive:
                        continue
                        
                    dx = f2.x - f1.x
                    dy = f2.y - f1.y
                    dist = math.hypot(dx, dy)
                    min_dist = f1.radius + f2.radius
                    
                    if dist < min_dist:
                        # Overlap corrective separation (push them apart based on relative masses)
                        if dist == 0:
                            dist = 0.05
                            dx = 0.05
                            
                        overlap = min_dist - dist
                        nx = dx / dist
                        ny = dy / dist
                        
                        # Distribute pushing according to inverse radii (mass is proportional to area)
                        total_mass = f1.mass + f2.mass
                        push_1 = overlap * (f2.mass / total_mass)
                        push_2 = overlap * (f1.mass / total_mass)
                        
                        f1.x -= nx * push_1
                        f1.y -= ny * push_1
                        f2.x += nx * push_2
                        f2.y += ny * push_2
                        
                        # Merge checklist: identical fruit ID matches!
                        if f1.id == f2.id:
                            self.merge_fruits(f1, f2)
                            continue
                            
                        # Perform elastic collision bounce with mechanical restitution
                        rvx = f2.vx - f1.vx
                        rvy = f2.vy - f1.vy
                        vel_normal = rvx * nx + rvy * ny
                        
                        if vel_normal < 0:
                            restitution = 0.25 # bouncy factor
                            impulse = -(1 + restitution) * vel_normal
                            impulse /= (1 / f1.mass + 1 / f2.mass)
                            
                            # Update velocities
                            f1.vx -= (impulse * nx) / f1.mass
                            f1.vy -= (impulse * ny) / f1.mass
                            f2.vx += (impulse * nx) / f2.mass
                            f2.vy += (impulse * ny) / f2.mass

    def update(self):
        if self.game_over:
            return
            
        # Manage cooldown for top-drop spawning
        if self.cooldown_timer > 0:
            self.cooldown_timer -= 1
            if self.cooldown_timer == 0:
                self.reset_held_fruit()
                
        # Clean inactive merged fruits
        self.fruits = [f for f in self.fruits if not f.inactive]
        
        # Standard gravity and boundary updates for each fruit
        for f in self.fruits:
            f.update()
            
        # Physics collisions
        self.resolve_collisions()
        
        # Check deadline overflows (GameOver)
        # We start checking overflows after fruit has dropped below deadline once or has settled.
        above_deadline_found = False
        for f in self.fruits:
            # If fruit is above DEADLINE_Y and is already moving slowly or settled
            if f.is_dropped and (f.y - f.radius < DEADLINE_Y):
                # We confirm it is not just passing through on the initial drop
                if f.vy >= -1: # Hovering, stationary or stacked
                    above_deadline_found = True
                    break
                    
        if above_deadline_found:
            self.show_warning_line = True
            self.deadline_warning_timer += 1
            if self.deadline_warning_timer >= self.max_deadline_warning_frames:
                self.game_over = True
                self.play_sound("fail")
        else:
            self.deadline_warning_timer = max(0, self.deadline_warning_timer - 2)
            self.show_warning_line = (self.deadline_warning_timer > 0)

    def draw_banner(self, surface):
        """Top bar scoring and next-preview canvas."""
        # Main Title banner
        font_title = pygame.font.SysFont("Arial", 26, bold=True)
        title_surf = font_title.render("MERGE FRUIT", True, COLOR_TEXT_MAIN)
        surface.blit(title_surf, (GAME_X, 15))
        
        # Score card
        score_bg = pygame.Rect(GAME_X, 50, 140, 55)
        pygame.draw.rect(surface, COLOR_CARD_BG, score_bg, border_radius=8)
        font_lbl = pygame.font.SysFont("Arial", 12)
        lbl_surf = font_lbl.render("CURRENT SCORE", True, COLOR_TEXT_MUTED)
        surface.blit(lbl_surf, (GAME_X + 12, 54))
        
        font_val = pygame.font.SysFont("Arial", 22, bold=True)
        val_surf = font_val.render(str(self.score), True, COLOR_TEXT_MAIN)
        surface.blit(val_surf, (GAME_X + 12, 70))
        
        # Best/High Score card
        best_bg = pygame.Rect(GAME_X + 155, 50, 140, 55)
        pygame.draw.rect(surface, COLOR_CARD_BG, best_bg, border_radius=8)
        lbl_best = font_lbl.render("PERSONAL BEST", True, COLOR_TEXT_MUTED)
        surface.blit(lbl_best, (GAME_X + 167, 54))
        val_best = font_val.render(str(self.high_score), True, COLOR_TEXT_MAIN)
        surface.blit(val_best, (GAME_X + 167, 70))
        
        # Next fruit preview panel
        next_bg = pygame.Rect(RIGHT_BOUND - 120, 50, 120, 55)
        pygame.draw.rect(surface, COLOR_CARD_BG, next_bg, border_radius=8)
        lbl_next = font_lbl.render("UP NEXT", True, COLOR_TEXT_MUTED)
        surface.blit(lbl_next, (RIGHT_BOUND - 108, 54))
        
        # Draw small preview circle of next fruit
        next_cfg = FRUIT_TYPES[self.next_id]
        preview_radius = min(12, next_cfg["radius"])
        pygame.draw.circle(surface, next_cfg["color"], (RIGHT_BOUND - 45, 78), preview_radius)
        pygame.draw.circle(surface, (40, 30, 25), (RIGHT_BOUND - 45, 78), preview_radius, 1)

    def draw(self, surface):
        surface.fill(COLOR_BG)
        
        # Draw stats and scores
        self.draw_banner(surface)
        
        # Draw Container BG
        container_rect = pygame.Rect(GAME_X, GAME_Y, GAME_WIDTH, GAME_HEIGHT)
        pygame.draw.rect(surface, COLOR_CONTAINER_BG, container_rect)
        pygame.draw.rect(surface, COLOR_CONTAINER_BORDER, container_rect, 4, border_radius=2)
        
        # Draw deadline warning line
        if self.show_warning_line:
            # Flashing visual effect
            alpha = int(128 + 127 * math.sin(pygame.time.get_ticks() * 0.01))
            deadline_color = (255, 50, 50)
            # Create surf for opacity line
            line_surface = pygame.Surface((GAME_WIDTH, 4), pygame.SRCALPHA)
            line_surface.fill((255, 50, 50, alpha))
            surface.blit(line_surface, (GAME_X, DEADLINE_Y))
        else:
            pygame.draw.line(surface, (200, 185, 175), (LEFT_BOUND, DEADLINE_Y), (RIGHT_BOUND, DEADLINE_Y), 2)
            
        # Draw dropped state fruits
        for f in self.fruits:
            f.draw(surface)
            
        # Draw held/dropping fruit helper lines
        if self.held_fruit and not self.game_over:
            # Draw dotted falling projection guide
            pt_y = int(self.held_fruit.y + self.held_fruit.radius)
            guide_color = (230, 220, 210)
            while pt_y < BOTTOM_BOUND:
                pygame.draw.line(surface, guide_color, (int(self.held_fruit.x), pt_y), (int(self.held_fruit.x), min(BOTTOM_BOUND, pt_y + 10)), 2)
                pt_y += 20
            # Draw actual held fruit
            self.held_fruit.draw(surface)
            
        # Spawning indicator status
        if self.cooldown_timer > 0 and not self.game_over:
            # Simple progress meter showing loader cycle
            pct = self.cooldown_timer / self.cooldown_duration
            pygame.draw.rect(surface, (220, 200, 185), (GAME_X, GAME_Y - 8, GAME_WIDTH * (1.0 - pct), 4))
            
        # Draw game over popup
        if self.game_over:
            overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
            overlay.fill((20, 15, 10, 180)) # Dim backdrop
            surface.blit(overlay, (0, 0))
            
            # Popup dialog
            popup_w, popup_h = 280, 220
            popup_rect = pygame.Rect((SCREEN_WIDTH - popup_w) // 2, (SCREEN_HEIGHT - popup_h) // 2, popup_w, popup_h)
            pygame.draw.rect(surface, COLOR_CONTAINER_BG, popup_rect, border_radius=12)
            pygame.draw.rect(surface, COLOR_CONTAINER_BORDER, popup_rect, 3, border_radius=12)
            
            font_go = pygame.font.SysFont("Arial", 28, bold=True)
            go_text = font_go.render("GAME OVER", True, (214, 40, 40))
            go_rect = go_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 60))
            surface.blit(go_text, go_rect)
            
            font_info = pygame.font.SysFont("Arial", 16)
            final_surf = font_info.render(f"Final Score: {self.score}", True, COLOR_TEXT_MAIN)
            final_rect = final_surf.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 20))
            surface.blit(final_surf, final_rect)
            
            best_val = max(self.score, self.high_score)
            best_surf = font_info.render(f"Best Score: {best_val}", True, COLOR_TEXT_MUTED)
            best_rect = best_surf.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 5))
            surface.blit(best_surf, best_rect)
            
            # Restart Button shape
            btn_left = SCREEN_WIDTH // 2 - 80
            btn_top = SCREEN_HEIGHT // 2 + 30
            btn_width = 160
            btn_height = 45
            btn_rect = pygame.Rect(btn_left, btn_top, btn_width, btn_height)
            pygame.draw.rect(surface, (90, 180, 120), btn_rect, border_radius=6)
            pygame.draw.rect(surface, (60, 140, 90), btn_rect, 2, border_radius=6)
            
            font_btn = pygame.font.SysFont("Arial", 16, bold=True)
            btn_surf = font_btn.render("PLAY AGAIN", True, (255, 255, 255))
            btn_text_rect = btn_surf.get_rect(center=(btn_left + btn_width // 2, btn_top + btn_height // 2))
            surface.blit(btn_surf, btn_text_rect)
