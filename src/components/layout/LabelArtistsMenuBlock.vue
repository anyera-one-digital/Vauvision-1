<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import {
  showLabelArtistsSection,
  showStandaloneAddArtist,
  artistsDropdownOpen,
  labelArtists,
  bitrixUserId,
  labelCabinetPseudonym,
  addArtistModalOpen,
  newArtistPseudonym,
  addArtistError,
  addArtistSubmitting,
  artistCabinetSwitching,
  canAddArtistFromMenu,
  artistsRootRef,
  toggleArtistsDropdown,
  openArtistCabinet,
  openAddArtistModal,
  closeAddArtistModal,
  submitNewArtist,
  labelArtistsMenuAttachDocumentClick,
  labelArtistsMenuDetachDocumentClick,
} from "@/composables/labelArtistsMenu";

withDefaults(
  defineProps<{
    /** false — только блок списка (модалка остаётся у другого экземпляра, напр. в боковом Menu) */
    includeModal?: boolean;
    /** Доп. класс на корне (бургер: уже без боковых отступов контейнера) */
    rootClass?: string;
  }>(),
  { includeModal: true, rootClass: "" }
);

const inputId = `label-new-artist-${Math.random().toString(36).slice(2, 10)}`;

let detachDoc: (() => void) | undefined;

onMounted(() => {
  labelArtistsMenuAttachDocumentClick();
  detachDoc = () => labelArtistsMenuDetachDocumentClick();
});

onUnmounted(() => {
  detachDoc?.();
});
</script>

<template>
  <div
    v-if="showLabelArtistsSection"
    ref="artistsRootRef"
    class="menu__artists"
    :class="rootClass"
  >
    <div
      v-if="showStandaloneAddArtist"
      class="menu__artists_panel menu__artists_panel_standalone"
    >
      <button
        type="button"
        class="menu__artists_add menu__artists_add_standalone"
        @click="openAddArtistModal"
      >
        Добавить артиста
      </button>
    </div>
    <template v-else>
      <button
        type="button"
        class="menu__artists_button"
        :class="{ menu__artists_button_open: artistsDropdownOpen }"
        @click.stop="toggleArtistsDropdown"
      >
        <span class="menu__artists_button_text">
          Артисты<span v-if="labelCabinetPseudonym"> ({{ labelCabinetPseudonym }})</span>
        </span>
        <span class="menu__artists_chevron" aria-hidden="true">▼</span>
      </button>
      <Transition name="label-artists-dd">
        <div v-if="artistsDropdownOpen" class="menu__artists_dropdown">
          <div class="menu__artists_panel">
            <ul v-if="labelArtists.length" class="menu__artists_list">
              <li v-for="a in labelArtists" :key="a.id" class="menu__artists_item">
                <button
                  type="button"
                  class="menu__artists_row"
                  :class="{
                    menu__artists_row_selected:
                      String(a.id) === String(bitrixUserId),
                  }"
                  :disabled="artistCabinetSwitching"
                  @click="openArtistCabinet(a.id)"
                >
                  <span class="menu__artists_row_text">{{ a.pseudonym }}</span>
                </button>
              </li>
            </ul>
            <button
              v-if="canAddArtistFromMenu"
              type="button"
              class="menu__artists_add"
              @click="openAddArtistModal"
            >
              Добавить артиста
            </button>
          </div>
        </div>
      </Transition>
    </template>
  </div>

  <Teleport v-if="includeModal" to="body">
    <div
      v-if="addArtistModalOpen"
      class="menu__artist_modal_overlay"
      @click.self="closeAddArtistModal"
    >
      <div
        class="menu__artist_modal"
        role="dialog"
        aria-labelledby="label-artist-modal-title"
      >
        <div class="menu__artist_modal_header">
          <h5 id="label-artist-modal-title" class="menu__artist_modal_title">
            Новый артист
          </h5>
          <button
            type="button"
            class="menu__artist_modal_close"
            @click="closeAddArtistModal"
          >
            ×
          </button>
        </div>
        <div class="menu__artist_modal_body">
          <label class="menu__artist_modal_label" :for="inputId"
            >Псевдоним</label
          >
          <input
            :id="inputId"
            v-model="newArtistPseudonym"
            type="text"
            class="menu__artist_modal_input"
            autocomplete="off"
            placeholder="Введите псевдоним"
            @keydown.enter.prevent="submitNewArtist"
          />
          <p v-if="addArtistError" class="menu__artist_modal_error">
            {{ addArtistError }}
          </p>
          <button
            type="button"
            class="menu__artist_modal_submit button button__primary"
            :disabled="addArtistSubmitting"
            @click="submitNewArtist"
          >
            <span>{{ addArtistSubmitting ? "Отправка…" : "Создать" }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.menu__artists {
  position: relative;
  z-index: 5;
  padding: 0 20px 15px 20px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 15px;

  &.menu__artists--burger {
    margin-bottom: 12px;
  }
}

.menu__artists--burger {
  .menu__artists_dropdown {
    left: 0;
    right: 0;
  }
}

.menu__artists--burger-inline {
  .menu__artists_dropdown {
    position: static;
    padding-top: 8px;
  }
}

.menu__artists_button {
  display: flex;
  width: 100%;
  padding: 12px 15px;
  align-items: center;
  gap: 10px;
  color: var(--text);
  background-color: var(--bg);
  border: 1px solid var(--border);
  border-radius: 30px;
  transition: border-color 0.15s linear;
  cursor: pointer;
  font-size: 14px;

  &:hover,
  &.menu__artists_button_open {
    border-color: var(--text);
  }

  &.menu__artists_button_open .menu__artists_chevron {
    transform: rotate(180deg);
  }
}

.menu__artists_button_text {
  flex: 1;
  min-width: 0;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu__artists_chevron {
  flex-shrink: 0;
  font-size: 9px;
  line-height: 1;
  opacity: 0.7;
  transition: transform 0.4s cubic-bezier(0.77, 0, 0.175, 1);
}

.menu__artists_dropdown {
  position: absolute;
  left: 20px;
  right: 20px;
  top: calc(100% - 8px);
  padding-top: 8px;
  z-index: 20;
}

.menu__artists_panel {
  background-color: var(--bg);
  border-radius: 12px;
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.08),
    0 2px 6px rgba(0, 0, 0, 0.06);
  overflow: hidden;

  &:has(.menu__artists_add) .menu__artists_list {
    margin-bottom: 10px;
  }

  &_standalone {
    border-radius: 30px;
  }
}

.label-artists-dd {
  &-enter-active,
  &-leave-active {
    transition:
      opacity 0.4s cubic-bezier(0.77, 0, 0.175, 1),
      max-height 0.4s cubic-bezier(0.77, 0, 0.175, 1),
      transform 0.4s cubic-bezier(0.77, 0, 0.175, 1);
    overflow: hidden;
  }

  &-enter-from {
    opacity: 0;
    max-height: 0;
    transform: translateY(-8px);
  }

  &-enter-to {
    opacity: 1;
    max-height: 520px;
    transform: translateY(0);
  }

  &-leave-from {
    opacity: 1;
    max-height: 520px;
    transform: translateY(0);
  }

  &-leave-to {
    opacity: 0;
    max-height: 0;
    transform: translateY(-6px);
  }
}

.menu__artists_list {
  list-style: none;
  margin: 0;
  padding: 6px 0;
  max-height: 220px;
  overflow-y: auto;
}

.menu__artists_item {
  margin: 0;
}

.menu__artists_row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s linear;

  &_text {
    min-width: 0;
    flex: 1;
    text-align: left;
  }

  &_selected {
    border-left: 3px solid #c0392b;
    padding-left: 11px;
    margin-left: 0;
    background: rgba(192, 57, 43, 0.07);
    color: #c0392b;

    &:hover {
      background: rgba(192, 57, 43, 0.11);
    }
  }

  &:hover:not(.menu__artists_row_selected) {
    background-color: var(--bg-color);
  }

  &:disabled {
    opacity: 0.55;
    cursor: wait;
    pointer-events: none;
  }
}

.menu__artists_add {
  display: block;
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-radius: 0;
  background-color: var(--color);
  color: #fff;
  font-size: 14px;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.12s linear;

  &:hover {
    background-color: var(--black);
  }

  &:focus-visible {
    outline: 2px solid #fff;
    outline-offset: -4px;
  }

  &_standalone {
    border-radius: 0;
    font-weight: 500;
  }
}

.menu__artist_modal_overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: rgba(0, 0, 0, 0.45);
}

.menu__artist_modal {
  width: 100%;
  max-width: 400px;
  background-color: var(--bg);
  border-radius: 16px;
  border: 1px solid var(--border);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);

  &_header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 18px;
    border-bottom: 1px solid var(--border);
  }

  &_title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
  }

  &_close {
    border: none;
    background: none;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    color: var(--text-secondary);
    padding: 0 4px;
  }

  &_body {
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &_label {
    font-size: 13px;
    color: var(--text-secondary);
  }

  &_input {
    width: 100%;
    padding: 12px 14px;
    font-size: 14px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background-color: var(--bg);
    color: var(--text);
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: var(--text);
    }
  }

  &_error {
    margin: 0;
    font-size: 13px;
    line-height: 1.4;
    color: #c0392b;
  }

  &_submit {
    margin-top: 4px;
    align-self: flex-start;
  }
}
</style>
