<template>
<div class="quiz__form quiz__form_two" v-if="!showImportantBlock">
  <div class="quiz__form_top">
    <h4 class="quiz__form_head">{{ getPageTitle() }}</h4>
    <button 
      class="quiz__additional button__second button" 
      @click="openPopup"
    >
      <span>Дополнительная информация</span>
    </button>
  </div>
  
  <!-- Попап с дополнительной информацией -->
  <Teleport to="body">
    <Transition name="popup-fade">
      <div v-if="isPopupVisible" class="quiz-popup__overlay" @click.self="closePopup">
        <div class="quiz-popup">
          <button class="quiz-popup__close" @click="closePopup">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div class="quiz-popup__content">
            <div class="quiz-popup__body">
              <div class="quiz-popup__instruction-block">
                <p>Выделите и выберите все нужные синглы *</p>
                <p>?</p>
                <p>Назовите файл трека по образцу: «# трека. Артист — Название».</p>
                <p>Например «1. КРЕСТ — SHiNE (prod. by CLONNEX)»</p>
                <p>Формат только .wav, разрядность только 16 bit</p>
              </div>
            </div>
            
            <div class="quiz-popup__footer">
              <button class="quiz-popup__button button__black button" @click="closePopup">
                <span>Понятно</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
  
  <div class="quiz__form_two_empty">
    <div class="quiz__form_two_lists">
      <p class="quiz__form_two_description text_small">Отметить артистов можно 3 способами:</p>
      <ul class="quiz__form_two_list">
        <li class="form__hint_item">
          <p class="quiz__form_two_description text_small">Артист 1, Артист 2 (через запятую). Тогда оба артиста будут считаться основными, у всех появится своя карточка артиста, в которые попадёт релиз (либо попадёт в существующие, если карточки уже есть).</p>
        </li>
        <li class="form__hint_item">
          <p class="form__hint text_small">Артист 1 feat Артист 2. Тут второй артист будет считаться второстепенным, релиз не отобразится у него в карточке. Если у Артист 2 нет карточки, то новая ему не создастся.</p>
        </li>
        <li class="form__hint_item">
          <p class="form__hint text_small">Артист 1 & Артист 2. В таком случае оба артиста будут считаться коллективом, для которого создастся отдельная карточка. У каждого артиста по отдельности карточки не будет, а релиз в них не попадёт.</p>
        </li>
      </ul>
      <p class="quiz__form_two_description text_small">Это все возможные варианты, отмечать артистов через "х" или другие знаки нельзя - площадки не принимают подобные релизы.</p>
      <p class="quiz__form_two_description text_small">Если вы хотите, чтобы рядом с названием трека серым цветом отображался Prod. by, то укажите это в скобках названия трека.</p>
    </div>
  </div>
  
  <!-- Кнопки для массовой загрузки аудиофайлов -->
  <div class="quiz__form_two_controls" v-if="showUploadAllSinglesButton || (albums.length > 0 && !hasAnyAlbumTracksWithFiles)">
    <button 
      v-if="showUploadAllSinglesButton"
      class="quiz__form_button button__black button" 
      @click="uploadAllSingles"
      :disabled="isLoadingTwo || isUploadingAllSingles"
    >
      <span v-if="!isUploadingAllSingles">Загрузить синглы</span>
      <span v-else>Загрузка... {{ uploadedSinglesCount }}/{{ singleCountFromQuiz1 }}</span>
    </button>
    <button 
      v-if="albums.length > 0 && !hasAnyAlbumTracksWithFiles"
      class="quiz__form_button button__black button" 
      @click="uploadAllAlbumTracks"
      :disabled="isLoadingTwo || isUploadingAllAlbums"
    >
      <span v-if="!isUploadingAllAlbums">Загрузить треки в альбом</span>
      <span v-else>Загрузка... {{ uploadedAlbumsCount }}/{{ totalTracksToUploadCount }}</span>
    </button>
  </div>
  
  <!-- СИНГЛЫ -->
  <div class="quiz__section" v-if="singleCountFromQuiz1 > 0 && singleTracks.length > 0 && dataLoaded">
    <h4 class="quiz__section_title">Синглы</h4>
    
    <div class="quiz__singles_list">
      <div 
        v-for="(track, trackIndex) in singleTracks" 
        :key="track.id"
        class="quiz__single_item"
      >
        <h5 class="quiz__single_item_title">Сингл {{ trackIndex + 1 }}</h5>
        
        <!-- Информация о загруженном аудио -->
        <div class="quiz__form_single_audio_info" v-if="track.audioFile">
          <div class="quiz__form_single_name">
            <div class="quiz__form_single_name_left">
              <p class="quiz__form_single_name_text">{{ track.audioFileName }}</p>
              <p class="quiz__form_single_name_size text_small">{{ formatFileSize(track.audioFileSize) }}</p>
            </div>
            <div class="quiz__form_single_name_svg" @click="removeSingleUploadedAudio(trackIndex)">
              <CloseSVG />
            </div>
          </div>
        </div>
        
        <!-- Форма с полями для сингла -->
        <div class="form__flex">
          <div class="form__group">
            <label class="form__label button">ФИО исполнителей<span>*</span></label>
            <el-input
              v-model="track.performerName"
              type="text"
              placeholder="Введите ФИО исполнителя"
              :disabled="isLoadingTwo"
              size="large"
              @input="() => validateSingleOnChange(trackIndex, 'performerName')"
              @change="() => validateSingleOnChange(trackIndex, 'performerName')"
              @blur="validateSinglePerformerName(trackIndex)"
            />
            <div v-if="singleErrors[trackIndex]?.performerName" class="error text_very quiz__form_single_error">
              {{ singleErrors[trackIndex].performerName }}
            </div>
          </div>
          
          <div class="form__group">
            <label class="form__label button">ФИО авторов музыки<span>*</span></label>
            <el-input
              v-model="track.musicAuthor"
              type="text"
              placeholder="Введите ФИО автора музыки"
              :disabled="isLoadingTwo"
              size="large"
              @input="() => validateSingleOnChange(trackIndex, 'musicAuthor')"
              @change="() => validateSingleOnChange(trackIndex, 'musicAuthor')"
              @blur="validateSingleMusicAuthor(trackIndex)"
            />
            <div v-if="singleErrors[trackIndex]?.musicAuthor" class="error text_very quiz__form_single_error">
              {{ singleErrors[trackIndex].musicAuthor }}
            </div>
          </div>
          
          <div class="form__group">
            <label class="form__label button">ФИО авторов текста<span>*</span></label>
            <el-input
              v-model="track.textAuthor"
              type="text"
              placeholder="Введите ФИО автора текста"
              :disabled="isLoadingTwo"
              size="large"
              @input="() => validateSingleOnChange(trackIndex, 'textAuthor')"
              @change="() => validateSingleOnChange(trackIndex, 'textAuthor')"
              @blur="validateSingleTextAuthor(trackIndex)"
            />
            <div v-if="singleErrors[trackIndex]?.textAuthor" class="error text_very quiz__form_single_error">
              {{ singleErrors[trackIndex].textAuthor }}
            </div>
          </div>
          
          <div class="form__group">
            <label class="form__label button">полное название трека<span>*</span></label>
            <ul class="form__hint_list">
              <li class="form__hint_item">
                <p class="form__hint text_small">Укажите полное название трека, включая псевдонимы и версии. Если загружаете альбом, то напишите номер каждого трека.</p>
              </li>
              <li class="form__hint_item">
                <p class="form__hint text_small">Если название на русском языке, не допускается писать «Каждое Слово С Большой Буквы». (название может быть написано «полностью маленькими буквами»).</p>
              </li>
              <li class="form__hint_item">
                <p class="form__hint text_small">Писать названия транслитом нельзя (например, нельзя писать «privet». Либо «Привет», либо «Hello»).</p>
              </li>
              <li class="form__hint_item">
                <p class="form__hint text_small">Использовать в названии треков 2+ языков нельзя (например, нельзя «Дорога to Success»)</p>
              </li>
            </ul>
            <el-input
              v-model="track.trackName"
              type="text"
              placeholder="Пример: «1. Ваш псевдоним – Название трека»"
              :disabled="isLoadingTwo"
              size="large"
              @input="() => validateSingleOnChange(trackIndex, 'trackName')"
              @change="() => validateSingleOnChange(trackIndex, 'trackName')"
              @blur="validateSingleTrackName(trackIndex)"
            />
            <div v-if="singleErrors[trackIndex]?.trackName" class="error text_very quiz__form_single_error">
              {{ singleErrors[trackIndex].trackName }}
            </div>
          </div>
          
          <!-- Права на инструментал -->
          <div class="form__group">
            <label class="form__label button">Права на инструментал<span>*</span></label>
            <el-select
              v-model="track.rightsType"
              placeholder="Выберите тип прав"
              :disabled="isLoadingTwo"
              size="large"
              @change="() => {
                validateSingleRights(trackIndex);
                validateSingleForm(trackIndex);
              }"
            >
              <el-option
                v-for="option in rightsOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
            <div v-if="singleErrors[trackIndex]?.rightsType" class="error text_very quiz__form_single_error">
              {{ singleErrors[trackIndex].rightsType }}
            </div>
            
            <!-- Поле для ссылки на договор — аренда и исключительная лицензия -->
            <div v-if="shouldShowRightsContractLink(track.rightsType)" class="form__group_inner">
              <label class="form__label button">Ссылка на договор<!-- <span>*</span> --></label>
              <el-input
                v-model="track.rightsContractLink"
                type="text"
                placeholder="https://..."
                :disabled="isLoadingTwo"
                size="large"
                @input="() => {
                  validateSingleRightsLink(trackIndex);
                  validateSingleRights(trackIndex);
                  validateSingleForm(trackIndex);
                }"
                @change="() => {
                  validateSingleRightsLink(trackIndex);
                  validateSingleRights(trackIndex);
                  validateSingleForm(trackIndex);
                }"
                @blur="() => {
                  validateSingleRightsLink(trackIndex);
                  validateSingleRights(trackIndex);
                  validateSingleForm(trackIndex);
                }"
              />
              <!--
              <div
                v-if="track.rightsType === 'wav' || track.rightsType === 'mp3'"
                class="error text_very quiz__form_single_error"
              >
                <template v-if="singleErrors[trackIndex]?.rightsContractLink">
                  {{ singleErrors[trackIndex].rightsContractLink }}<br />
                </template>
                {{ WAV_MP3_LEASE_SHIPPING_NOTICE }}
              </div>
              -->
              <div
                v-if="singleErrors[trackIndex]?.rightsContractLink"
                class="error text_very quiz__form_single_error"
              >
                {{ singleErrors[trackIndex].rightsContractLink }}
              </div>
            </div>
            
            <!-- Дополнительное необязательное поле для gifted/free вариантов -->
            <div v-if="track.rightsType === 'free' || track.rightsType === 'gifted'" class="form__group_inner">
              <label class="form__label button text_small">Дополнительная информация (необязательно)</label>
              <el-input
                v-model="track.additionalInfo"
                type="text"
                placeholder="Укажите любую дополнительную информацию"
                :disabled="isLoadingTwo"
                size="large"
                @input="saveStateToDB"
                @change="saveStateToDB"
              />
            </div>
            
            <!-- Предупреждение для risky вариантов -->
            <div v-if="track.rightsType === 'free'" class="warning text_very quiz__form_single_error">
              ⚠️ Внимание! Такие треки могут не пройти модерацию. Если у вас нет договора на инструментал, то вы действуете на свой страх и риск – если релиз будет отклонён, оплата не возвращается. Рекомендуем купить инструментал и подписать договор с автором.
            </div>
            <div v-if="track.rightsType === 'gifted'" class="warning text_very quiz__form_single_error">
              ⚠️ Рекомендуем убедиться, что инструментал полностью авторский, и в нём не использованы вставки/сэмплы, нарушающие чужие права. Иначе релиз может не пройти модерацию, и вы действуете на свой страх и риск – если релиз будет отклонён, оплата не возвращается. Рекомендуем купить инструментал и подписать договор с автором. По возможности прикрепите договор.
            </div>
            <div v-if="track.rightsType === 'mp3' || track.rightsType === 'wav'" class="warning text_very quiz__form_single_error">
              ⚠️ Внимание! Убедитесь, что у вас есть право использовать инструментал для отгрузки на площадки, и в нём не использованы чужие (пиратские) сэмплы, вставки и проч. Если у вас нет договора на инструментал, то вы действуете на свой страх и риск – если релиз будет отклонён по причине нарушения прав, оплата не возвращается. Рекомендуем купить инструментал и подписать договор с автором, если этого не сделано. По возможности, прикрепите договор.
            </div>
          </div>
        </div>
        
        <!-- Кнопка удаления сингла -->
        <div class="quiz__single_footer">
          <button 
            class="quiz__single_track_remove button__red button" 
            @click="removeSingleTrack(trackIndex)"
          >
            <span>Удалить сингл</span>
          </button>
        </div>
        
        <!-- Сообщение об ошибке загрузки аудио -->
        <div v-if="singleErrors[trackIndex]?.audioFile" class="error text_very quiz__form_single_error">
          {{ singleErrors[trackIndex].audioFile }}
        </div>
      </div>
    </div>
    
    <!-- Кнопка добавления нового сингла -->
    <div class="quiz__add_single_button" v-if="canAddMoreSingles">
      <button 
        class="quiz__form_button button__black button" 
        @click="addSingleTrackWithFile"
        :disabled="isLoadingTwo"
      >
        <span>+ Добавить сингл ({{ singleTracks.length }}/{{ singleCountFromQuiz1 }})</span>
      </button>
    </div>
  </div>
  
  <!-- АЛЬБОМЫ -->
  <div class="quiz__section" v-if="albumCountFromQuiz1 > 0 && albums.length > 0 && dataLoaded && albums.some(album => album.tracks.length > 0)">
    <div class="quiz__albums_list">
      <div 
        v-for="(album, albumIndex) in albums" 
        :key="album.id"
        class="quiz__album_item"
      >
        <h5 class="quiz__album_item_title">Альбом {{ albumIndex + 1 }}</h5>
        
        <!-- Название альбома удалено - теперь вводится в Quiz3 -->
        
        <!-- Треки альбома -->
        <div class="quiz__album_tracks">
          <div class="quiz__album_tracks_list">
            <div 
              v-for="(track, trackIndex) in album.tracks" 
              :key="track.id"
              class="quiz__album_track_item"
            >
              <!-- Информация о загруженном аудио трека -->
              <div class="quiz__album_track_audio_info" v-if="track.audioFile">
                <div class="quiz__form_single_name">
                  <div class="quiz__form_single_name_left">
                    <p class="quiz__form_single_name_text">{{ track.audioFileName }}</p>
                    <p class="quiz__form_single_name_size text_small">{{ formatFileSize(track.audioFileSize) }}</p>
                  </div>
                  <div class="quiz__form_single_name_svg" @click="removeAlbumTrackAudio(albumIndex, trackIndex)">
                    <CloseSVG />
                  </div>
                </div>
              </div>
              
              <!-- Поля для ввода информации о треке -->
              <div class="form__flex">
                <div class="form__group">
                  <label class="form__label button">ФИО исполнителей<span>*</span></label>
                  <el-input
                    v-model="track.performerName"
                    type="text"
                    placeholder="Введите ФИО исполнителя"
                    :disabled="isLoadingTwo"
                    size="large"
                    @input="() => validateAlbumTrackOnChange(albumIndex, trackIndex, 'performerName')"
                    @change="() => validateAlbumTrackOnChange(albumIndex, trackIndex, 'performerName')"
                    @blur="validateAlbumTrackPerformerName(albumIndex, trackIndex)"
                  />
                  <div v-if="albumErrors[albumIndex]?.tracks[trackIndex]?.performerName" class="error text_very quiz__form_single_error">
                    {{ albumErrors[albumIndex].tracks[trackIndex].performerName }}
                  </div>
                </div>
                
                <div class="form__group">
                  <label class="form__label button">ФИО авторов музыки<span>*</span></label>
                  <el-input
                    v-model="track.musicAuthor"
                    type="text"
                    placeholder="Введите ФИО автора музыки"
                    :disabled="isLoadingTwo"
                    size="large"
                    @input="() => validateAlbumTrackOnChange(albumIndex, trackIndex, 'musicAuthor')"
                    @change="() => validateAlbumTrackOnChange(albumIndex, trackIndex, 'musicAuthor')"
                    @blur="validateAlbumTrackMusicAuthor(albumIndex, trackIndex)"
                  />
                  <div v-if="albumErrors[albumIndex]?.tracks[trackIndex]?.musicAuthor" class="error text_very quiz__form_single_error">
                    {{ albumErrors[albumIndex].tracks[trackIndex].musicAuthor }}
                  </div>
                </div>
                
                <div class="form__group">
                  <label class="form__label button">ФИО авторов текста<span>*</span></label>
                  <el-input
                    v-model="track.textAuthor"
                    type="text"
                    placeholder="Введите ФИО автора текста"
                    :disabled="isLoadingTwo"
                    size="large"
                    @input="() => validateAlbumTrackOnChange(albumIndex, trackIndex, 'textAuthor')"
                    @change="() => validateAlbumTrackOnChange(albumIndex, trackIndex, 'textAuthor')"
                    @blur="validateAlbumTrackTextAuthor(albumIndex, trackIndex)"
                  />
                  <div v-if="albumErrors[albumIndex]?.tracks[trackIndex]?.textAuthor" class="error text_very quiz__form_single_error">
                    {{ albumErrors[albumIndex].tracks[trackIndex].textAuthor }}
                  </div>
                </div>
                
                <div class="form__group">
                  <label class="form__label button">полное название трека<span>*</span></label>
                  <ul class="form__hint_list">
                    <li class="form__hint_item">
                      <p class="form__hint text_small">Укажите полное название трека, включая псевдонимы и версии. Если загружаете альбом, то напишите номер каждого трека.</p>
                    </li>
                    <li class="form__hint_item">
                      <p class="form__hint text_small">Например: «1. Artist 1, Artist 2 – Best Song (Prod. by Beatmaker)»</p>
                    </li>
                    <li class="form__hint_item">
                      <p class="form__hint text_small">Если название на русском языке, не допускается писать «Каждое Слово С Большой Буквы». (название может быть написано «полностью маленькими буквами»).</p>
                    </li>
                    <li class="form__hint_item">
                      <p class="form__hint text_small">Писать названия транслитом нельзя (например, нельзя писать «privet». Либо «Привет», либо «Hello»).</p>
                    </li>
                    <li class="form__hint_item">
                      <p class="form__hint text_small">Использовать в названии треков 2+ языков нельзя (например, нельзя «Дорога to Success»)</p>
                    </li>
                  </ul>
                  <el-input
                    v-model="track.trackName"
                    type="text"
                    placeholder="Пример: «1. Ваш псевдоним – Название трека»"
                    :disabled="isLoadingTwo"
                    size="large"
                    @input="() => validateAlbumTrackOnChange(albumIndex, trackIndex, 'trackName')"
                    @change="() => validateAlbumTrackOnChange(albumIndex, trackIndex, 'trackName')"
                    @blur="validateAlbumTrackTrackName(albumIndex, trackIndex)"
                  />
                  <div v-if="albumErrors[albumIndex]?.tracks[trackIndex]?.trackName" class="error text_very quiz__form_single_error">
                    {{ albumErrors[albumIndex].tracks[trackIndex].trackName }}
                  </div>
                </div>
                
                <!-- Права на инструментал -->
                <div class="form__group">
                  <label class="form__label button">Права на инструментал<span>*</span></label>
                  <el-select
                    v-model="track.rightsType"
                    placeholder="Выберите тип прав"
                    :disabled="isLoadingTwo"
                    size="large"
                    @change="() => {
                      validateAlbumTrackRights(albumIndex, trackIndex);
                      validateAlbumTrackForm(albumIndex, trackIndex);
                    }"
                  >
                    <el-option
                      v-for="option in rightsOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                  <div v-if="albumErrors[albumIndex]?.tracks[trackIndex]?.rightsType" class="error text_very quiz__form_single_error">
                    {{ albumErrors[albumIndex].tracks[trackIndex].rightsType }}
                  </div>
                  
                  <!-- Поле для ссылки на договор — аренда и исключительная лицензия -->
                  <div v-if="shouldShowRightsContractLink(track.rightsType)" class="form__group_inner">
                    <label class="form__label button">Ссылка на договор<!-- <span>*</span> --></label>
                    <el-input
                      v-model="track.rightsContractLink"
                      type="text"
                      placeholder="https://..."
                      :disabled="isLoadingTwo"
                      size="large"
                      @input="() => {
                        validateAlbumTrackRightsLink(albumIndex, trackIndex);
                        validateAlbumTrackRights(albumIndex, trackIndex);
                        validateAlbumTrackForm(albumIndex, trackIndex);
                      }"
                      @change="() => {
                        validateAlbumTrackRightsLink(albumIndex, trackIndex);
                        validateAlbumTrackRights(albumIndex, trackIndex);
                        validateAlbumTrackForm(albumIndex, trackIndex);
                      }"
                      @blur="() => {
                        validateAlbumTrackRightsLink(albumIndex, trackIndex);
                        validateAlbumTrackRights(albumIndex, trackIndex);
                        validateAlbumTrackForm(albumIndex, trackIndex);
                      }"
                    />
                    <!--
                    <div
                      v-if="track.rightsType === 'wav' || track.rightsType === 'mp3'"
                      class="error text_very quiz__form_single_error"
                    >
                      <template v-if="albumErrors[albumIndex]?.tracks[trackIndex]?.rightsContractLink">
                        {{ albumErrors[albumIndex].tracks[trackIndex].rightsContractLink }}<br />
                      </template>
                      {{ WAV_MP3_LEASE_SHIPPING_NOTICE }}
                    </div>
                    -->
                    <div
                      v-if="albumErrors[albumIndex]?.tracks[trackIndex]?.rightsContractLink"
                      class="error text_very quiz__form_single_error"
                    >
                      {{ albumErrors[albumIndex].tracks[trackIndex].rightsContractLink }}
                    </div>
                  </div>
                  
                  <!-- Дополнительное необязательное поле для gifted/free вариантов -->
                  <div v-if="track.rightsType === 'free' || track.rightsType === 'gifted'" class="form__group_inner">
                    <label class="form__label button text_small">Дополнительная информация (необязательно)</label>
                    <el-input
                      v-model="track.additionalInfo"
                      type="text"
                      placeholder="Укажите любую дополнительную информацию"
                      :disabled="isLoadingTwo"
                      size="large"
                      @input="saveStateToDB"
                      @change="saveStateToDB"
                    />
                  </div>
                  
                  <!-- Предупреждение для risky вариантов -->
                  <div v-if="track.rightsType === 'free'" class="warning text_very quiz__form_single_error">
                    ⚠️ Внимание! Такие треки могут не пройти модерацию. Если у вас нет договора на инструментал, то вы действуете на свой страх и риск – если релиз будет отклонён, оплата не возвращается. Рекомендуем купить инструментал и подписать договор с автором.
                  </div>
                  <div v-if="track.rightsType === 'gifted'" class="warning text_very quiz__form_single_error">
                    ⚠️ Рекомендуем убедиться, что инструментал полностью авторский, и в нём не использованы вставки/сэмплы, нарушающие чужие права. Иначе релиз может не пройти модерацию, и вы действуете на свой страх и риск – если релиз будет отклонён, оплата не возвращается. Рекомендуем купить инструментал и подписать договор с автором. По возможности прикрепите договор.
                  </div>
                  <div v-if="track.rightsType === 'mp3' || track.rightsType === 'wav'" class="warning text_very quiz__form_single_error">
                    ⚠️ Внимание! Убедитесь, что у вас есть право использовать инструментал для отгрузки на площадки, и в нём не использованы чужие (пиратские) сэмплы, вставки и проч. Если у вас нет договора на инструментал, то вы действуете на свой страх и риск – если релиз будет отклонён по причине нарушения прав, оплата не возвращается. Рекомендуем купить инструментал и подписать договор с автором, если этого не сделано. По возможности, прикрепите договор.
                  </div>
                </div>
              </div>
              
              <!-- Кнопка удаления трека -->
              <div class="quiz__album_track_footer">
                <button 
                  class="quiz__album_track_remove button__red button" 
                  @click="removeAlbumTrack(albumIndex, trackIndex)"
                >
                  <span>Удалить трек</span>
                </button>
              </div>
              
              <!-- Сообщение об ошибке загрузки аудио -->
              <div v-if="albumErrors[albumIndex]?.tracks[trackIndex]?.audioFile" class="error text_very quiz__form_single_error">
                {{ albumErrors[albumIndex].tracks[trackIndex].audioFile }}
              </div>
            </div>
          </div>
          
          <!-- Кнопка добавления нового трека -->
          <!-- <div class="quiz__album_add_track" v-if="album.tracks.length < 20">
            <button 
              class="quiz__form_single_button button__black button" 
              @click="() => addAlbumTrackWithFile(albumIndex)"
              :disabled="isLoadingTwo"
            >
              <span>+ Добавить трек в альбом ({{ album.tracks.length }}/20)</span>
            </button>
          </div>
          <div v-else class="quiz__album_max_tracks_warning">
            <p class="text_small warning">Достигнут лимит треков в альбоме (максимум 20)</p>
          </div> -->
          <div class="quiz__album_add_track">
            <button 
              class="quiz__form_single_button button__black button" 
              @click="() => addAlbumTrackWithFile(albumIndex)"
              :disabled="isLoadingTwo"
            >
              <span>+ Добавить трек в альбом</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="quiz__form_bottom" v-if="dataLoaded && (singleTracks.length > 0 || albums.length > 0)">
    <div class="quiz__form_buttons">
      <button 
        class="form__back button__second button" 
        @click="goBack"
        :disabled="isLoadingTwo"
      >
        <span><BackSVG /></span>
        <span>Назад</span>
      </button>
      <button 
        class="quiz__form_button button__black button"
        @click="handleContinue"
        :disabled="!isReadyForNextStep || isLoadingTwo"
      >
        <span v-if="!isLoadingTwo">Продолжить</span>
        <span v-else>Сохранение...</span>
      </button>
    </div>
  </div>
  <div v-else-if="dataLoaded && singleCountFromQuiz1 === 0 && albumCountFromQuiz1 === 0" class="quiz__no_items">
    <p class="quiz__no_items_text">Не выбрано ни одного сингла или альбома. Вернитесь на предыдущий шаг.</p>
    <div class="quiz__form_bottom">
      <div class="quiz__form_buttons">
        <button 
          class="form__back button__second button" 
          @click="goBack"
          :disabled="isLoadingTwo"
        >
          <span><BackSVG /></span>
          <span>Назад</span>
        </button>
      </div>
    </div>
  </div>
</div>

<!-- Блок с важной информацией -->
<div class="quiz__form quiz__important" v-if="showImportantBlock">
  <h4 class="quiz__important_head">важно!</h4>
  <ul class="quiz__important_list">
    <li class="quiz__important_item">
      <p class="quiz__important_description">В ваших треках не должно быть пиратского контента, т.е. сэмплов и иных кусков чужих треков, на которые у вас нет документального разрешения от авторов (скрин переписки не подойдёт, только договор передачи прав)!</p>
    </li>
    <li class="quiz__important_item">
      <p class="quiz__important_description">Отрывки и сэмплы даже длительностью 1, 3, 5 и т.д. секунд НЕ ДОПУСКАЮТСЯ и НЕ ПРОЙДУТ модерацию.</p>
    </li>
    <li class="quiz__important_item">
      <p class="quiz__important_description">Если в ваших треках использованы элементы чужих авторов без их разрешения, то нужно либо убрать эти элементы, либо не загружать такой трек. Приписка «Кавер»,«Cover» или любая другая не даёт права использовать материалы чужих авторов без их письменного согласия.</p>
    </li>
    <li class="quiz__important_item">
      <p class="quiz__important_description"><b style="color:var(--color)" >Если вы грузите подобный контент, то соглашаетесь с тем, что делаете это на свой страх и риск. В случае не выхода трека по причине использования пиратского контента, оплата за загрузку НЕ ВОЗВРАЩАЕТСЯ.</b></p>
    </li>
  </ul>
  <div class="quiz__form_bottom">
    <div class="quiz__form_buttons">
      <button 
        class="form__back button__second button" 
        @click="goBack"
        :disabled="isLoadingTwo"
      >
        <span><BackSVG /></span>
        <span>Назад</span>
      </button>
      <button 
        class="quiz__form_button button__black button"
        @click="handleAccept"
        :disabled="isLoadingTwo"
      >
        <span v-if="!isLoadingTwo">принимаю</span>
        <span v-else>Переход...</span>
      </button>
    </div>
  </div>
</div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue';
import { ElInput, ElSelect, ElOption, ElMessage } from 'element-plus';
import BackSVG from "@/uikit/icon/BackSVG.vue";
import CloseSVG from "@/uikit/icon/CloseSVG.vue";
import { openDB } from '@/utils/inMemoryIdb';

const emit = defineEmits<{
  'go-back': [];
  'go-next': [];
}>();

const STORAGE_KEY = 'quiz2_state';
const DB_NAME = 'quizDB';
const AUDIO_DB_NAME = 'audioDB';
const DB_VERSION = 2;
const STORE_NAME = 'quizState';
const AUDIO_STORE_NAME = 'audio';

// Опции для прав
const rightsOptions = [
  { value: 'author', label: 'Я 100% автор музыки' },
  { value: 'exclusive', label: 'Исключительная лицензия / полная передача права' },
  { value: 'wav', label: 'Wav лицензия / Аренда' },
  { value: 'mp3', label: 'mp3 лицензия / Аренда' },
  { value: 'free', label: 'free for profit / бит с ютуба' },
  { value: 'gifted', label: 'подарен / отдан бесплатно / сделан по дружбе' }
];

/** Для этих типов прав показываем поле ссылки на договор */
function shouldShowRightsContractLink(rightsType: string): boolean {
  return (
    rightsType === 'wav' ||
    rightsType === 'mp3' ||
    rightsType === 'exclusive'
  );
}

/** Только исключительная лицензия требует обязательную ссылку на договор */
function needsRightsContractLink(rightsType: string): boolean {
  return rightsType === 'exclusive';
}

/** Допустимые треки: по расширению и/или MIME (macOS часто даёт audio/x-wav, иногда пустой type). */
const TRACK_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.aac', '.m4a', '.ogg'];
const TRACK_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/flac',
  'audio/x-flac',
  'audio/aac',
  'audio/mp4',
  'audio/x-m4a',
  'audio/ogg',
  'application/ogg',
];

function isAllowedTrackAudioFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  const extOk = TRACK_AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
  const typeOk = Boolean(file.type) && TRACK_AUDIO_MIME_TYPES.includes(file.type);
  return extOk || typeOk;
}

const ACCEPT_TRACK_AUDIO =
  '.mp3,.wav,.flac,.aac,.m4a,.ogg,audio/mpeg,audio/wav,audio/x-wav,audio/flac,audio/aac,audio/mp4,audio/ogg';

// const WAV_MP3_LEASE_SHIPPING_NOTICE =
//   'Внимание! В связи с усилением внимания к правам на отгружаемый контент со стороны площадок, сроки отгрузки релизов с таким типов прав (wav/mp3 аренда, лизинг) может быть увеличен до 14 календарных дней. Пожалуйста, учитывайте это при планировании даты релиза!'

const isLoadingTwo = ref(false);
const showImportantBlock = ref(false);
const quizDB = ref<any>(null);
const audioDB = ref<any>(null);
const dataLoaded = ref(false);
const dbInitialized = ref(false);
const audioDBInitialized = ref(false);

const isUploadingAllSingles = ref(false);
const isUploadingAllAlbums = ref(false);
const uploadedSinglesCount = ref(0);
const uploadedAlbumsCount = ref(0);

const isPopupVisible = ref(false);

const singleCountFromQuiz1 = ref(0);
const albumCountFromQuiz1 = ref(0);

const showUploadAllSinglesButton = computed(() => {
  if (singleCountFromQuiz1.value === 0) return false;
  const needToUpload = singleCountFromQuiz1.value - singleTracks.value.length;
  return needToUpload > 0 && singleTracks.value.length === 0;
});

const canAddMoreSingles = computed(() => {
  if (singleCountFromQuiz1.value === 0) return false;
  return singleTracks.value.length < singleCountFromQuiz1.value;
});

const hasAnyAlbumTracksWithFiles = computed(() => {
  if (albumCountFromQuiz1.value === 0) return false;
  if (albums.value.length === 0) return false;
  return albums.value.some(album => album.tracks.length > 0);
});

const totalTracksToUploadCount = computed(() => {
  let count = 0;
  albums.value.forEach(album => {
    album.tracks.forEach(track => {
      if (!track.audioFile) count++;
    });
  });
  return count;
});

const forbiddenWords = ['нет', 'такой', 'информации', 'не', 'знаю', 'откуда'];

interface AlbumTrack {
  id: string;
  trackNumber: number;
  trackName: string;
  performerName: string;
  musicAuthor: string;
  textAuthor: string;
  audioFile: File | null;
  audioFileName: string;
  audioFileSize: number;
  audioFileId: string | null;
  uploaded: boolean;
  rightsType: string;
  rightsContractLink: string;
  additionalInfo: string;
  product_id?: string;
}

interface SingleTrack {
  id: string;
  performerName: string;
  musicAuthor: string;
  textAuthor: string;
  trackName: string;
  audioFile: File | null;
  audioFileName: string;
  audioFileSize: number;
  audioFileId: string | null;
  uploaded: boolean;
  hasAudioUploaded: boolean;
  rightsType: string;
  rightsContractLink: string;
  additionalInfo: string;
  product_id?: string;
}

const singleErrors = ref<Array<{
  performerName: string;
  musicAuthor: string;
  textAuthor: string;
  trackName: string;
  audioFile: string;
  rightsType: string;
  rightsContractLink: string;
}>>([]);

const albumErrors = ref<Array<{
  albumName: string;
  tracks: Array<{
    performerName: string;
    musicAuthor: string;
    textAuthor: string;
    trackName: string;
    audioFile: string;
    rightsType: string;
    rightsContractLink: string;
  }>;
}>>([]);

const singleTracks = ref<SingleTrack[]>([]);

const albums = ref<Array<{
  id: string;
  albumName: string;
  performerName: string;
  musicAuthor: string;
  textAuthor: string;
  tracks: AlbumTrack[];
}>>([]);

// Валидация прав для сингла
const validateSingleRights = (trackIndex: number) => {
  const track = singleTracks.value[trackIndex];
  let error = '';
  
  if (!track.rightsType) {
    error = 'Выберите тип прав на инструментал';
  // } else if (needsRightsContractLink(track.rightsType)) {
  //   if (!track.rightsContractLink?.trim()) {
  //     error = 'Для выбранного типа прав необходима ссылка на договор';
  //   } else if (!isValidUrl(track.rightsContractLink)) {
  //     error = 'Введите корректную ссылку (начинается с https://)';
  //   }
  } else if (track.rightsContractLink?.trim() && !isValidUrl(track.rightsContractLink)) {
    error = 'Введите корректную ссылку (начинается с https://)';
  }
  
  singleErrors.value[trackIndex].rightsType = error;
  return !error;
};

const validateSingleRightsLink = (trackIndex: number) => {
  const track = singleTracks.value[trackIndex];
  let error = '';
  
  // if (needsRightsContractLink(track.rightsType) && !track.rightsContractLink?.trim()) {
  //   error = 'Ссылка на договор обязательна';
  // } else if (track.rightsContractLink?.trim() && !isValidUrl(track.rightsContractLink)) {
  if (track.rightsContractLink?.trim() && !isValidUrl(track.rightsContractLink)) {
    error = 'Введите корректную ссылку (начинается с https://)';
  }
  
  singleErrors.value[trackIndex].rightsContractLink = error;
  return !error;
};

// Валидация прав для трека альбома
const validateAlbumTrackRights = (albumIndex: number, trackIndex: number) => {
  const track = albums.value[albumIndex].tracks[trackIndex];
  let error = '';
  
  if (!track.rightsType) {
    error = 'Выберите тип прав на инструментал';
  // } else if (needsRightsContractLink(track.rightsType)) {
  //   if (!track.rightsContractLink?.trim()) {
  //     error = 'Для выбранного типа прав необходима ссылка на договор';
  //   } else if (!isValidUrl(track.rightsContractLink)) {
  //     error = 'Введите корректную ссылку (начинается с https://)';
  //   }
  } else if (track.rightsContractLink?.trim() && !isValidUrl(track.rightsContractLink)) {
    error = 'Введите корректную ссылку (начинается с https://)';
  }
  
  albumErrors.value[albumIndex].tracks[trackIndex].rightsType = error;
  return !error;
};

const validateAlbumTrackRightsLink = (albumIndex: number, trackIndex: number) => {
  const track = albums.value[albumIndex].tracks[trackIndex];
  let error = '';
  
  // if (needsRightsContractLink(track.rightsType) && !track.rightsContractLink?.trim()) {
  //   error = 'Ссылка на договор обязательна';
  // } else if (track.rightsContractLink?.trim() && !isValidUrl(track.rightsContractLink)) {
  if (track.rightsContractLink?.trim() && !isValidUrl(track.rightsContractLink)) {
    error = 'Введите корректную ссылку (начинается с https://)';
  }
  
  albumErrors.value[albumIndex].tracks[trackIndex].rightsContractLink = error;
  return !error;
};

const isValidUrl = (url: string): boolean => {
  if (!url.trim()) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const initDB = async () => {
  try {
    quizDB.value = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
        }
      },
    });
    
    audioDB.value = await openDB(AUDIO_DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
          const store = db.createObjectStore(AUDIO_STORE_NAME, { keyPath: 'id' });
          store.createIndex('fileName', 'fileName');
        }
      },
    });
    
    dbInitialized.value = true;
    audioDBInitialized.value = true;
  } catch (error) {
    console.error('Quiz2: Error initializing IndexedDB:', error);
    dbInitialized.value = false;
    audioDBInitialized.value = false;
  }
};

const safeDBOperation = async <T>(
  operation: () => Promise<T>, 
  fallback: T,
  dbType: 'quiz' | 'audio' = 'quiz'
): Promise<T> => {
  const db = dbType === 'quiz' ? quizDB.value : audioDB.value;
  const initialized = dbType === 'quiz' ? dbInitialized.value : audioDBInitialized.value;
  const storeName = dbType === 'quiz' ? STORE_NAME : AUDIO_STORE_NAME;
  
  if (!initialized || !db) {
    return fallback;
  }
  
  try {
    if (!db.objectStoreNames || !db.objectStoreNames.contains(storeName)) {
      return fallback;
    }
    return await operation();
  } catch (error) {
    console.error(`Quiz2: Error in ${dbType} DB operation:`, error);
    return fallback;
  }
};

const saveAudioToDB = async (file: File, fileId: string): Promise<void> => {
  await safeDBOperation(
    async () => {
      const blob = new Blob([file], { type: file.type });
      await audioDB.value.put(AUDIO_STORE_NAME, {
        id: fileId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        data: blob,
        timestamp: Date.now()
      });
    },
    null,
    'audio'
  );
};

const loadAudioFromDB = async (fileId: string): Promise<{ file: File; fileName: string; fileSize: number } | null> => {
  return safeDBOperation(
    async () => {
      const stored = await audioDB.value.get(AUDIO_STORE_NAME, fileId);
      if (stored) {
        const file = new File([stored.data], stored.fileName, { type: stored.fileType });
        return {
          file,
          fileName: stored.fileName,
          fileSize: stored.fileSize
        };
      }
      return null;
    },
    null,
    'audio'
  );
};

const removeAudioFromDB = async (fileId: string) => {
  await safeDBOperation(
    async () => {
      await audioDB.value.delete(AUDIO_STORE_NAME, fileId);
    },
    null,
    'audio'
  );
};

const getCountsFromQuiz1 = async () => {
  return safeDBOperation(
    async () => {
      const quiz1State = await quizDB.value.get(STORE_NAME, 'quiz1_state');
      if (quiz1State) {
        return {
          singleCount: quiz1State.singleCount || 0,
          albumCount: quiz1State.albumCount || 0
        };
      }
      return { singleCount: 0, albumCount: 0 };
    },
    { singleCount: 0, albumCount: 0 }
  );
};

const saveStateToDB = async () => {
  await safeDBOperation(
    async () => {
      let prevState: any = null;
      try {
        prevState = await quizDB.value.get(STORE_NAME, STORAGE_KEY);
      } catch {
        prevState = null;
      }

      const productIdForSingle = (track: SingleTrack): string | undefined => {
        if (track.product_id) return track.product_id;
        const old = prevState?.singleTracks?.find((t: { id?: string }) => t?.id === track.id);
        return old?.product_id;
      };

      const productIdForAlbumTrack = (
        album: { id: string; tracks: AlbumTrack[] },
        track: AlbumTrack,
      ): string | undefined => {
        if (track.product_id) return track.product_id;
        const oldAlbum = prevState?.albums?.find((a: { id?: string }) => a?.id === album.id);
        const oldTrack = oldAlbum?.tracks?.find((t: { id?: string }) => t?.id === track.id);
        return oldTrack?.product_id;
      };

      const stateToSave: any = {
        id: STORAGE_KEY,
        timestamp: Date.now()
      };
      
      if (singleCountFromQuiz1.value > 0) {
        stateToSave.singleTracks = singleTracks.value.map(track => {
          const product_id = productIdForSingle(track);
          const row: Record<string, unknown> = {
            id: track.id,
            performerName: track.performerName,
            musicAuthor: track.musicAuthor,
            textAuthor: track.textAuthor,
            trackName: track.trackName,
            audioFileName: track.audioFileName || '',
            audioFileSize: track.audioFileSize || 0,
            uploaded: track.uploaded || false,
            hasAudioUploaded: track.hasAudioUploaded || false,
            audioFileId: track.audioFileId || null,
            rightsType: track.rightsType || '',
            rightsContractLink: track.rightsContractLink || '',
            additionalInfo: track.additionalInfo || ''
          };
          if (product_id) row.product_id = product_id;
          return row;
        });
      }
      
      if (albumCountFromQuiz1.value > 0) {
        stateToSave.albums = albums.value.map(album => ({
          id: album.id,
          albumName: album.albumName,
          performerName: album.performerName,
          musicAuthor: album.musicAuthor,
          textAuthor: album.textAuthor,
          tracks: album.tracks.map(track => {
            const product_id = productIdForAlbumTrack(album, track);
            const row: Record<string, unknown> = {
              id: track.id,
              trackNumber: track.trackNumber,
              trackName: track.trackName,
              performerName: track.performerName,
              musicAuthor: track.musicAuthor,
              textAuthor: track.textAuthor,
              audioFileName: track.audioFileName || '',
              audioFileSize: track.audioFileSize || 0,
              uploaded: track.uploaded || false,
              audioFileId: track.audioFileId || null,
              rightsType: track.rightsType || '',
              rightsContractLink: track.rightsContractLink || '',
              additionalInfo: track.additionalInfo || ''
            };
            if (product_id) row.product_id = product_id;
            return row;
          })
        }));
      }
      
      await quizDB.value.put(STORE_NAME, stateToSave);
      window.dispatchEvent(new CustomEvent('quiz-data-updated'));
    },
    null
  );
};

const loadSinglesFromStorage = async (savedState: any) => {
  if (singleCountFromQuiz1.value === 0) {
    singleTracks.value = [];
    singleErrors.value = [];
    return;
  }
  
  if (savedState && savedState.singleTracks && savedState.singleTracks.length > 0) {
    const loadedTracks = [];
    // Ограничиваем количество загружаемых синглов согласно singleCountFromQuiz1
    const tracksToLoad = savedState.singleTracks.slice(0, singleCountFromQuiz1.value);
    
    for (const track of tracksToLoad) {
      let audioFile = null;
      
      if (track.audioFileId) {
        const audioData = await loadAudioFromDB(track.audioFileId);
        if (audioData) {
          audioFile = audioData.file;
        }
      }
      
      if (audioFile) {
        const row: SingleTrack = {
          id: track.id,
          performerName: track.performerName || '',
          musicAuthor: track.musicAuthor || '',
          textAuthor: track.textAuthor || '',
          trackName: track.trackName || '',
          audioFile: audioFile,
          audioFileName: track.audioFileName || '',
          audioFileSize: track.audioFileSize || 0,
          audioFileId: track.audioFileId || null,
          uploaded: true,
          hasAudioUploaded: true,
          rightsType: track.rightsType || '',
          rightsContractLink: track.rightsContractLink || '',
          additionalInfo: track.additionalInfo || ''
        };
        if (track.product_id) row.product_id = track.product_id;
        loadedTracks.push(row);
      }
    }
    singleTracks.value = loadedTracks;
    
    // Если загружено меньше, чем нужно, удаляем лишние аудиофайлы из БД
    const extraTracks = savedState.singleTracks.slice(singleCountFromQuiz1.value);
    for (const extraTrack of extraTracks) {
      if (extraTrack.audioFileId) {
        await removeAudioFromDB(extraTrack.audioFileId);
      }
    }
  } else {
    singleTracks.value = [];
  }
  
  singleErrors.value = singleTracks.value.map(() => ({
    performerName: '',
    musicAuthor: '',
    textAuthor: '',
    trackName: '',
    audioFile: '',
    rightsType: '',
    rightsContractLink: ''
  }));
};

const loadAlbumsFromStorage = async (savedState: any, requiredCount: number) => {
  if (albumCountFromQuiz1.value === 0) {
    albums.value = [];
    albumErrors.value = [];
    return;
  }
  
  if (savedState && savedState.albums && savedState.albums.length > 0) {
    // Ограничиваем количество загружаемых альбомов согласно albumCountFromQuiz1
    const albumsToLoad = savedState.albums.slice(0, albumCountFromQuiz1.value);
    
    albums.value = await Promise.all(
      albumsToLoad.map(async (album: any, albumIndex: number) => {
        const newAlbum = {
          id: album.id || `album-${Date.now()}-${albumIndex}-${Math.random()}`,
          albumName: album.albumName || '',
          performerName: album.performerName || '',
          musicAuthor: album.musicAuthor || '',
          textAuthor: album.textAuthor || '',
          tracks: [] as AlbumTrack[]
        };
        
        if (album.tracks && Array.isArray(album.tracks) && album.tracks.length > 0) {
          newAlbum.tracks = await Promise.all(
            album.tracks.map(async (track: any, trackIndex: number) => {
              let audioFile = null;
              
              if (track.audioFileId) {
                const audioData = await loadAudioFromDB(track.audioFileId);
                if (audioData) {
                  audioFile = audioData.file;
                }
              }
              
              const row: AlbumTrack = {
                id: track.id || `album-track-${Date.now()}-${trackIndex}-${Math.random()}`,
                trackNumber: track.trackNumber || trackIndex + 1,
                trackName: track.trackName || '',
                performerName: track.performerName || album.performerName || '',
                musicAuthor: track.musicAuthor || album.musicAuthor || '',
                textAuthor: track.textAuthor || album.textAuthor || '',
                audioFile: audioFile,
                audioFileName: track.audioFileName || '',
                audioFileSize: track.audioFileSize || 0,
                audioFileId: track.audioFileId || null,
                uploaded: track.uploaded || false,
                rightsType: track.rightsType || '',
                rightsContractLink: track.rightsContractLink || '',
                additionalInfo: track.additionalInfo || ''
              };
              if (track.product_id) row.product_id = track.product_id;
              return row;
            })
          );
        }
        
        return newAlbum;
      })
    );
    
    // Удаляем лишние альбомы из БД
    const extraAlbums = savedState.albums.slice(albumCountFromQuiz1.value);
    for (const extraAlbum of extraAlbums) {
      if (extraAlbum.tracks && Array.isArray(extraAlbum.tracks)) {
        for (const track of extraAlbum.tracks) {
          if (track.audioFileId) {
            await removeAudioFromDB(track.audioFileId);
          }
        }
      }
    }
  } else if (requiredCount > 0) {
    albums.value = [];
    for (let i = 0; i < requiredCount; i++) {
      albums.value.push({
        id: `album-${Date.now()}-${i}-${Math.random()}`,
        albumName: '',
        performerName: '',
        musicAuthor: '',
        textAuthor: '',
        tracks: []
      });
    }
  } else {
    albums.value = [];
  }
  
  albumErrors.value = albums.value.map(album => ({
    albumName: '',
    tracks: album.tracks.map(() => ({
      performerName: '',
      musicAuthor: '',
      textAuthor: '',
      trackName: '',
      audioFile: '',
      rightsType: '',
      rightsContractLink: ''
    }))
  }));
};

const getPageTitle = () => {
  const singlesToLoad = singleCountFromQuiz1.value;
  const albumsToLoad = albumCountFromQuiz1.value;
  
  if (singlesToLoad > 0 && albumsToLoad === 0) {
    return singlesToLoad === 1 ? 'ЗАГРУЗКА СИНГЛА' : 'ЗАГРУЗКА СИНГЛОВ';
  }
  
  if (albumsToLoad > 0 && singlesToLoad === 0) {
    return 'ЗАГРУЗКА АЛЬБОМА';
  }
  
  return 'ЗАГРУЗКА СИНГЛОВ И АЛЬБОМОВ';
};

// Добавьте эту функцию в компонент
const cleanupExcessData = async () => {
  if (!dbInitialized.value) return;
  
  try {
    const savedState = await quizDB.value.get(STORE_NAME, STORAGE_KEY);
    if (savedState) {
      // Очищаем лишние синглы
      if (savedState.singleTracks && savedState.singleTracks.length > singleCountFromQuiz1.value) {
        const tracksToRemove = savedState.singleTracks.slice(singleCountFromQuiz1.value);
        for (const track of tracksToRemove) {
          if (track.audioFileId) {
            await removeAudioFromDB(track.audioFileId);
          }
        }
        savedState.singleTracks = savedState.singleTracks.slice(0, singleCountFromQuiz1.value);
      }
      
      // Очищаем лишние альбомы
      if (savedState.albums && savedState.albums.length > albumCountFromQuiz1.value) {
        const albumsToRemove = savedState.albums.slice(albumCountFromQuiz1.value);
        for (const album of albumsToRemove) {
          if (album.tracks && Array.isArray(album.tracks)) {
            for (const track of album.tracks) {
              if (track.audioFileId) {
                await removeAudioFromDB(track.audioFileId);
              }
            }
          }
        }
        savedState.albums = savedState.albums.slice(0, albumCountFromQuiz1.value);
      }
      
      await quizDB.value.put(STORE_NAME, savedState);
    }
  } catch (error) {
    console.error('Error cleaning up excess data:', error);
  }
};

// Вызовите cleanupExcessData после загрузки counts
const loadStateFromDB = async () => {
  if (!dbInitialized.value) return;
  
  await safeDBOperation(
    async () => {
      const counts = await getCountsFromQuiz1();
      
      singleCountFromQuiz1.value = counts.singleCount;
      albumCountFromQuiz1.value = counts.albumCount;
      
      // Очищаем лишние данные перед загрузкой
      await cleanupExcessData();
      
      // Загружаем обновленные данные
      const updatedState = await quizDB.value.get(STORE_NAME, STORAGE_KEY);
      
      if (counts.singleCount > 0) {
        await loadSinglesFromStorage(updatedState);
      } else {
        singleTracks.value = [];
        singleErrors.value = [];
      }
      
      if (counts.albumCount > 0) {
        await loadAlbumsFromStorage(updatedState, counts.albumCount);
      } else {
        albums.value = [];
        albumErrors.value = [];
      }
    },
    null
  );
};

const isReadyForNextStep = computed(() => {
  const allSinglesComplete = singleCountFromQuiz1.value === 0 || 
    (singleTracks.value.length === singleCountFromQuiz1.value && 
     singleTracks.value.every((track, index) => {
      if (!track.audioFile || !track.uploaded) return false;
      
      return isValidFullTrackTitleFormat(track.trackName) &&
        !singleErrors.value[index]?.trackName &&
        isValidFioList(track.performerName) &&
        !singleErrors.value[index]?.performerName &&
        isValidFioList(track.musicAuthor) &&
        !singleErrors.value[index]?.musicAuthor &&
        isValidFioList(track.textAuthor) &&
        !singleErrors.value[index]?.textAuthor &&
        track.rightsType &&
        !singleErrors.value[index]?.rightsType &&
        // Ссылка на договор НЕ обязательна (по просьбе клиента): пускаем без неё,
        // блокируем только если ссылка введена и в неверном формате.
        !singleErrors.value[index]?.rightsContractLink;
    }));

  const allAlbumsComplete = albumCountFromQuiz1.value === 0 || 
    (albums.value.length === albumCountFromQuiz1.value && 
     albums.value.every((album, albumIndex) => {
      if (album.tracks.length === 0) return false;
      
      return album.tracks.every((track, trackIndex) => {
        if (!track.audioFile || !track.uploaded) return false;
        
        const isPerformerValid = isValidFioList(track.performerName) &&
          !albumErrors.value[albumIndex]?.tracks[trackIndex]?.performerName;
        
        const isMusicAuthorValid = isValidFioList(track.musicAuthor) &&
          !albumErrors.value[albumIndex]?.tracks[trackIndex]?.musicAuthor;
        
        const isTextAuthorValid = isValidFioList(track.textAuthor) &&
          !albumErrors.value[albumIndex]?.tracks[trackIndex]?.textAuthor;
        
        const isTrackNameValid =
          isValidFullTrackTitleFormat(track.trackName) &&
          !albumErrors.value[albumIndex]?.tracks[trackIndex]?.trackName;
        
        // Ссылка на договор НЕ обязательна: пускаем без неё, блокируем только при неверном формате.
        const isRightsValid = track.rightsType &&
          !albumErrors.value[albumIndex]?.tracks[trackIndex]?.rightsType &&
          !albumErrors.value[albumIndex]?.tracks[trackIndex]?.rightsContractLink;
        
        return isTrackNameValid && isPerformerValid && isMusicAuthorValid && 
               isTextAuthorValid && isRightsValid;
      });
    }));

  return allSinglesComplete && allAlbumsComplete;
});

const checkForbiddenWords = (value: string): boolean => {
  if (!value.trim()) return false;
  const lowerValue = value.toLowerCase();
  return forbiddenWords.some(word => 
    lowerValue.includes(` ${word} `) || 
    lowerValue.startsWith(`${word} `) || 
    lowerValue.endsWith(` ${word}`) ||
    lowerValue === word
  );
};

const checkMinWords = (value: string, minWords: number): boolean => {
  if (!value.trim()) return false;
  return value.trim().split(/\s+/).length >= minWords;
};

// Для ФИО разрешаем только буквы (любой локали), пробелы и дефис.
// Кавычки и прочие спецсимволы должны давать ошибку валидации.
const hasInvalidFioSymbols = (value: string): boolean => /[^\p{L}\s-]/u.test(value.trim());

const splitFioEntries = (value: string): string[] =>
  value
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);

const isValidFioList = (value: string): boolean => {
  const entries = splitFioEntries(value);
  if (!entries.length) return false;

  return entries.every(entry => {
    if (hasInvalidFioSymbols(entry)) return false;
    if (!checkMinWords(entry, 3)) return false;
    if (checkForbiddenWords(entry)) return false;
    return true;
  });
};

/** Формат: «1. Псевдоним – Название трека» (разделитель — дефис или типографское тире, с пробелами). */
const FULL_TRACK_NAME_PATTERN_ERROR =
  'Укажите номер трека, псевдоним и название через пробелы. Пример: 1. VAUVISION - Интро';

const isValidFullTrackTitleFormat = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^\d+\.\s+(.+?)\s[–\-—]\s+(.+)$/u.test(trimmed);
};

const validateSinglePerformerName = (trackIndex: number) => {
  const value = singleTracks.value[trackIndex].performerName;
  const entries = splitFioEntries(value);
  let error = '';
  
  if (!value.trim()) {
    error = 'ФИО исполнителя обязательно для заполнения';
  } else if (!entries.length) {
    error = 'ФИО исполнителя обязательно для заполнения';
  } else if (entries.some(hasInvalidFioSymbols)) {
    error = 'Удалите кавычки и спецсимволы из ФИО исполнителя (в каждом ФИО через запятую)';
  } else if (entries.some(entry => !checkMinWords(entry, 3))) {
    error = 'Каждое ФИО исполнителя через запятую должно содержать минимум 3 слова (например: Иван Иванович Иванов)';
  } else if (entries.some(checkForbiddenWords)) {
    error = 'В поле "ФИО исполнителей" запрещено использовать слова: "нет", "такой", "информации", "не", "знаю", "откуда"';
  }
  
  singleErrors.value[trackIndex].performerName = error;
  return !error;
};

const validateSingleMusicAuthor = (trackIndex: number) => {
  const value = singleTracks.value[trackIndex].musicAuthor;
  const entries = splitFioEntries(value);
  let error = '';
  
  if (!value.trim()) {
    error = 'ФИО автора музыки обязательно для заполнения';
  } else if (!entries.length) {
    error = 'ФИО автора музыки обязательно для заполнения';
  } else if (entries.some(hasInvalidFioSymbols)) {
    error = 'Удалите кавычки и спецсимволы из ФИО автора музыки (в каждом ФИО через запятую)';
  } else if (entries.some(entry => !checkMinWords(entry, 3))) {
    error = 'Каждое ФИО автора музыки через запятую должно содержать минимум 3 слова (например: Иван Иванович Иванов)';
  } else if (entries.some(checkForbiddenWords)) {
    error = 'В поле "ФИО авторов музыки" запрещено использовать слова: "нет", "такой", "информации", "не", "знаю", "откуда"';
  }
  
  singleErrors.value[trackIndex].musicAuthor = error;
  return !error;
};

const validateSingleTextAuthor = (trackIndex: number) => {
  const value = singleTracks.value[trackIndex].textAuthor;
  const entries = splitFioEntries(value);
  let error = '';
  
  if (!value.trim()) {
    error = 'ФИО автора текста обязательно для заполнения';
  } else if (!entries.length) {
    error = 'ФИО автора текста обязательно для заполнения';
  } else if (entries.some(hasInvalidFioSymbols)) {
    error = 'Удалите кавычки и спецсимволы из ФИО автора текста (в каждом ФИО через запятую)';
  } else if (entries.some(entry => !checkMinWords(entry, 3))) {
    error = 'Каждое ФИО автора текста через запятую должно содержать минимум 3 слова (например: Иван Иванович Иванов)';
  } else if (entries.some(checkForbiddenWords)) {
    error = 'В поле "ФИО авторов текста" запрещено использовать слова: "нет", "такой", "информации", "не", "знаю", "откуда"';
  }
  
  singleErrors.value[trackIndex].textAuthor = error;
  return !error;
};

const validateSingleTrackName = (trackIndex: number) => {
  const value = singleTracks.value[trackIndex].trackName;
  let error = '';
  
  if (!value.trim()) {
    error = 'Название трека обязательно для заполнения';
  } else if (!isValidFullTrackTitleFormat(value)) {
    error = FULL_TRACK_NAME_PATTERN_ERROR;
  }
  
  singleErrors.value[trackIndex].trackName = error;
  return !error;
};

const validateSingleForm = async (trackIndex: number) => {
  let isValid = true;
  
  if (!validateSinglePerformerName(trackIndex)) isValid = false;
  if (!validateSingleMusicAuthor(trackIndex)) isValid = false;
  if (!validateSingleTextAuthor(trackIndex)) isValid = false;
  if (!validateSingleTrackName(trackIndex)) isValid = false;
  if (!validateSingleRights(trackIndex)) isValid = false;
  
  if (!singleTracks.value[trackIndex].audioFile) {
    singleErrors.value[trackIndex].audioFile = 'Аудио файл обязателен для загрузки';
    isValid = false;
  } else {
    singleErrors.value[trackIndex].audioFile = '';
  }
  
  return isValid;
};

const validateAlbumTrackPerformerName = (albumIndex: number, trackIndex: number) => {
  const value = albums.value[albumIndex].tracks[trackIndex].performerName;
  const entries = splitFioEntries(value);
  let error = '';
  
  if (!value.trim()) {
    error = 'ФИО исполнителя обязательно для заполнения';
  } else if (!entries.length) {
    error = 'ФИО исполнителя обязательно для заполнения';
  } else if (entries.some(hasInvalidFioSymbols)) {
    error = 'Удалите кавычки и спецсимволы из ФИО исполнителя (в каждом ФИО через запятую)';
  } else if (entries.some(entry => !checkMinWords(entry, 3))) {
    error = 'Каждое ФИО исполнителя через запятую должно содержать минимум 3 слова (например: Иван Иванович Иванов)';
  } else if (entries.some(checkForbiddenWords)) {
    error = 'В поле "ФИО исполнителей" запрещено использовать слова: "нет", "такой", "информации", "не", "знаю", "откуда"';
  }
  
  albumErrors.value[albumIndex].tracks[trackIndex].performerName = error;
  return !error;
};

const validateAlbumTrackMusicAuthor = (albumIndex: number, trackIndex: number) => {
  const value = albums.value[albumIndex].tracks[trackIndex].musicAuthor;
  const entries = splitFioEntries(value);
  let error = '';
  
  if (!value.trim()) {
    error = 'ФИО автора музыки обязательно для заполнения';
  } else if (!entries.length) {
    error = 'ФИО автора музыки обязательно для заполнения';
  } else if (entries.some(hasInvalidFioSymbols)) {
    error = 'Удалите кавычки и спецсимволы из ФИО автора музыки (в каждом ФИО через запятую)';
  } else if (entries.some(entry => !checkMinWords(entry, 3))) {
    error = 'Каждое ФИО автора музыки через запятую должно содержать минимум 3 слова (например: Иван Иванович Иванов)';
  } else if (entries.some(checkForbiddenWords)) {
    error = 'В поле "ФИО авторов музыки" запрещено использовать слова: "нет", "такой", "информации", "не", "знаю", "откуда"';
  }
  
  albumErrors.value[albumIndex].tracks[trackIndex].musicAuthor = error;
  return !error;
};

const validateAlbumTrackTextAuthor = (albumIndex: number, trackIndex: number) => {
  const value = albums.value[albumIndex].tracks[trackIndex].textAuthor;
  const entries = splitFioEntries(value);
  let error = '';
  
  if (!value.trim()) {
    error = 'ФИО автора текста обязательно для заполнения';
  } else if (!entries.length) {
    error = 'ФИО автора текста обязательно для заполнения';
  } else if (entries.some(hasInvalidFioSymbols)) {
    error = 'Удалите кавычки и спецсимволы из ФИО автора текста (в каждом ФИО через запятую)';
  } else if (entries.some(entry => !checkMinWords(entry, 3))) {
    error = 'Каждое ФИО автора текста через запятую должно содержать минимум 3 слова (например: Иван Иванович Иванов)';
  } else if (entries.some(checkForbiddenWords)) {
    error = 'В поле "ФИО авторов текста" запрещено использовать слова: "нет", "такой", "информации", "не", "знаю", "откуда"';
  }
  
  albumErrors.value[albumIndex].tracks[trackIndex].textAuthor = error;
  return !error;
};

const validateAlbumTrackTrackName = (albumIndex: number, trackIndex: number) => {
  const value = albums.value[albumIndex].tracks[trackIndex].trackName;
  let error = '';
  
  if (!value.trim()) {
    error = 'Название трека обязательно для заполнения';
  } else if (!isValidFullTrackTitleFormat(value)) {
    error = FULL_TRACK_NAME_PATTERN_ERROR;
  }
  
  albumErrors.value[albumIndex].tracks[trackIndex].trackName = error;
  return !error;
};

const validateAlbumTrackForm = async (albumIndex: number, trackIndex: number) => {
  let isValid = true;
  
  if (!validateAlbumTrackPerformerName(albumIndex, trackIndex)) isValid = false;
  if (!validateAlbumTrackMusicAuthor(albumIndex, trackIndex)) isValid = false;
  if (!validateAlbumTrackTextAuthor(albumIndex, trackIndex)) isValid = false;
  if (!validateAlbumTrackTrackName(albumIndex, trackIndex)) isValid = false;
  if (!validateAlbumTrackRights(albumIndex, trackIndex)) isValid = false;
  
  if (!albums.value[albumIndex].tracks[trackIndex].audioFile) {
    albumErrors.value[albumIndex].tracks[trackIndex].audioFile = 'Аудио файл обязателен для загрузки';
    isValid = false;
  } else {
    albumErrors.value[albumIndex].tracks[trackIndex].audioFile = '';
  }
  
  return isValid;
};

const generateAudioId = (type: 'single' | 'album', ...indices: number[]): string => {
  return `${type}-${indices.join('-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const addSingleTrackWithFile = async () => {
  if (singleCountFromQuiz1.value === 0) {
    ElMessage.warning('Синглы не выбраны на первом шаге');
    return;
  }
  
  if (singleTracks.value.length >= singleCountFromQuiz1.value) {
    ElMessage.warning(`Максимальное количество синглов - ${singleCountFromQuiz1.value}`);
    return;
  }
  
  // Создаем input элемент
  const input = document.createElement('input');
  input.type = 'file';
  // ВАЖНО: для iOS нужно указывать конкретные расширения, а не просто audio/*
  input.accept = ACCEPT_TRACK_AUDIO;
  input.multiple = false;
  input.style.position = 'absolute';
  input.style.top = '-100px';
  input.style.left = '-100px';
  input.style.opacity = '0';
  
  // Добавляем в DOM (обязательно для iOS)
  document.body.appendChild(input);
  
  // Флаг для предотвращения двойной обработки
  let isProcessing = false;
  
  // Обработчик выбора файла
  const handleFileSelect = async (event: Event) => {
    if (isProcessing) return;
    
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    // Удаляем обработчики
    input.removeEventListener('change', handleFileSelect);
    input.removeEventListener('cancel', handleCancel);
    
    // Удаляем input из DOM
    if (document.body.contains(input)) {
      document.body.removeChild(input);
    }
    
    if (!file) {
      return;
    }
    
    isProcessing = true;
    isLoadingTwo.value = true;
    
    try {
      // Проверка размера файла
      if (file.size === 0) {
        throw new Error('Файл имеет 0 байт. Проверьте файл и попробуйте снова.');
      }
      
      if (!isAllowedTrackAudioFile(file)) {
        throw new Error('Недопустимый формат файла. Поддерживаются: MP3, WAV, FLAC, AAC, M4A, OGG');
      }

      if (
        file.type &&
        !TRACK_AUDIO_MIME_TYPES.includes(file.type) &&
        !file.type.startsWith('audio/')
      ) {
        console.warn(`Нестандартный MIME-тип: ${file.type}, расширение при этом допустимо`);
      }
      
      // Генерируем ID и сохраняем в IndexedDB
      const fileId = generateAudioId('single', singleTracks.value.length);
      await saveAudioToDB(file, fileId);
      
      // Создаем новый трек
      const newTrack: SingleTrack = {
        id: `single-${Date.now()}-${singleTracks.value.length}-${Math.random()}`,
        performerName: '',
        musicAuthor: '',
        textAuthor: '',
        trackName: '',
        audioFile: file,
        audioFileName: file.name,
        audioFileSize: file.size,
        audioFileId: fileId,
        uploaded: true,
        hasAudioUploaded: true,
        rightsType: '',
        rightsContractLink: '',
        additionalInfo: ''
      };
      
      singleTracks.value.push(newTrack);
      singleErrors.value.push({
        performerName: '',
        musicAuthor: '',
        textAuthor: '',
        trackName: '',
        audioFile: '',
        rightsType: '',
        rightsContractLink: ''
      });
      
      // Обновляем реактивность
      singleTracks.value = [...singleTracks.value];
      await saveStateToDB();
      
      ElMessage.success(`Сингл добавлен (${singleTracks.value.length}/${singleCountFromQuiz1.value})`);
      
    } catch (error: any) {
      console.error('Ошибка при загрузке файла:', error);
      ElMessage.error(`Ошибка загрузки: ${error.message}`);
    } finally {
      isLoadingTwo.value = false;
      isProcessing = false;
    }
  };
  
  // Обработчик отмены выбора файла
  const handleCancel = () => {
    if (document.body.contains(input)) {
      document.body.removeChild(input);
    }
  };
  
  // Добавляем обработчики
  input.addEventListener('change', handleFileSelect);
  input.addEventListener('cancel', handleCancel);
  
  // Задержка перед вызовом click() для iOS
  setTimeout(() => {
    input.click();
  }, 100);
};

const removeSingleTrack = async (trackIndex: number) => {
  if (trackIndex >= 0 && trackIndex < singleTracks.value.length) {
    const track = singleTracks.value[trackIndex];
    
    if (track.audioFileId) {
      await removeAudioFromDB(track.audioFileId);
    }
    
    const newTracks = singleTracks.value.filter((_, index) => index !== trackIndex);
    singleTracks.value = newTracks;
    singleErrors.value = singleErrors.value.filter((_, index) => index !== trackIndex);
    
    await saveStateToDB();
    
    ElMessage.success('Сингл удален');
  }
};

const removeSingleUploadedAudio = async (trackIndex: number) => {
  if (trackIndex >= 0 && trackIndex < singleTracks.value.length) {
    const track = singleTracks.value[trackIndex];
    
    if (track.audioFileId) {
      await removeAudioFromDB(track.audioFileId);
    }
    
    const newTracks = singleTracks.value.filter((_, index) => index !== trackIndex);
    singleTracks.value = newTracks;
    singleErrors.value = singleErrors.value.filter((_, index) => index !== trackIndex);
    
    await saveStateToDB();
    
    ElMessage.success('Сингл удален');
  }
};

const uploadAllSingles = async () => {
  if (singleCountFromQuiz1.value === 0) {
    ElMessage.info('Синглы не выбраны на первом шаге');
    return;
  }
  
  const needToUpload = singleCountFromQuiz1.value - singleTracks.value.length;
  
  if (needToUpload === 0) {
    ElMessage.info('Все синглы уже загружены');
    return;
  }
  
  // Создаем input с правильными атрибутами для iOS
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = ACCEPT_TRACK_AUDIO;
  input.multiple = true; // Для массовой загрузки
  input.style.position = 'absolute';
  input.style.top = '-100px';
  input.style.left = '-100px';
  input.style.opacity = '0';
  
  document.body.appendChild(input);
  
  const handleFileSelect = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files || []);
    
    // Удаляем input
    if (document.body.contains(input)) {
      document.body.removeChild(input);
    }
    
    if (files.length === 0) return;
    
    if (files.length !== needToUpload) {
      ElMessage.warning(`Выбрано ${files.length} файлов, но требуется загрузить ${needToUpload} синглов. Будут загружены первые ${Math.min(files.length, needToUpload)} файлов.`);
    }
    
    isUploadingAllSingles.value = true;
    uploadedSinglesCount.value = 0;
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < needToUpload && i < files.length; i++) {
      try {
        const file = files[i];
        
        // Проверка размера
        if (file.size === 0) {
          throw new Error('Файл имеет 0 байт');
        }
        
        if (!isAllowedTrackAudioFile(file)) {
          throw new Error(`Недопустимый формат файла: ${file.name}`);
        }
        
        const fileId = generateAudioId('single', singleTracks.value.length);
        await saveAudioToDB(file, fileId);
        
        const newTrack: SingleTrack = {
          id: `single-${Date.now()}-${singleTracks.value.length}-${Math.random()}`,
          performerName: '',
          musicAuthor: '',
          textAuthor: '',
          trackName: '',
          audioFile: file,
          audioFileName: file.name,
          audioFileSize: file.size,
          audioFileId: fileId,
          uploaded: true,
          hasAudioUploaded: true,
          rightsType: '',
          rightsContractLink: '',
          additionalInfo: ''
        };
        
        singleTracks.value.push(newTrack);
        singleErrors.value.push({
          performerName: '',
          musicAuthor: '',
          textAuthor: '',
          trackName: '',
          audioFile: '',
          rightsType: '',
          rightsContractLink: ''
        });
        
        successCount++;
      } catch (error: any) {
        errorCount++;
        ElMessage.error(`Ошибка загрузки сингла ${i + 1}: ${error.message}`);
      }
      uploadedSinglesCount.value = successCount + errorCount;
    }
    
    isUploadingAllSingles.value = false;
    singleTracks.value = [...singleTracks.value];
    await saveStateToDB();
    
    if (errorCount > 0) {
      ElMessage.warning(`Загружено ${successCount} из ${needToUpload} синглов. Ошибок: ${errorCount}`);
    } else {
      ElMessage.success(`Все ${needToUpload} синглов успешно загружены`);
    }
  };
  
  input.addEventListener('change', handleFileSelect);
  
  // Небольшая задержка для iOS
  setTimeout(() => {
    input.click();
  }, 100);
};

const uploadAllAlbumTracks = async () => {
  if (albumCountFromQuiz1.value === 0) {
    ElMessage.info('Альбомы не выбраны на первом шаге');
    return;
  }
  
  if (albums.value.length === 0) {
    ElMessage.info('Нет доступных альбомов');
    return;
  }
  
  const album = albums.value[0];
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = ACCEPT_TRACK_AUDIO;
  input.multiple = true;
  input.style.display = 'none';
  
  input.onchange = async (event) => {
    const files = Array.from((event.target as HTMLInputElement).files || []);
    if (files.length === 0) return;
    
    isUploadingAllAlbums.value = true;
    uploadedAlbumsCount.value = 0;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        if (file.size === 0) {
          throw new Error('Файл имеет 0 байт');
        }
        
        if (!isAllowedTrackAudioFile(file)) {
          throw new Error('Недопустимый формат файла');
        }
        
        const fileId = generateAudioId('album', 0, album.tracks.length);
        await saveAudioToDB(file, fileId);
        
        const newTrack: AlbumTrack = {
          id: `album-track-${Date.now()}-${Math.random()}`,
          trackNumber: album.tracks.length + 1,
          trackName: '',
          performerName: album.performerName || '',
          musicAuthor: album.musicAuthor || '',
          textAuthor: album.textAuthor || '',
          audioFile: file,
          audioFileName: file.name,
          audioFileSize: file.size,
          audioFileId: fileId,
          uploaded: true,
          rightsType: '',
          rightsContractLink: '',
          additionalInfo: ''
        };
        
        album.tracks.push(newTrack);
        
        if (!albumErrors.value[0]) {
          albumErrors.value[0] = { albumName: '', tracks: [] };
        }
        
        albumErrors.value[0].tracks.push({
          performerName: '',
          musicAuthor: '',
          textAuthor: '',
          trackName: '',
          audioFile: '',
          rightsType: '',
          rightsContractLink: ''
        });
        
        albums.value = [...albums.value];
        successCount++;
      } catch (error: any) {
        errorCount++;
        ElMessage.error(`Ошибка загрузки трека ${i + 1}: ${error.message}`);
      }
      uploadedAlbumsCount.value = successCount + errorCount;
    }
    
    isUploadingAllAlbums.value = false;
    albums.value = [...albums.value];
    await saveStateToDB();
    
    if (errorCount > 0) {
      ElMessage.warning(`Загружено ${successCount} из ${files.length} треков. Ошибок: ${errorCount}`);
    } else {
      ElMessage.success(`Все ${files.length} треков успешно загружены в альбом`);
    }
  };
  
  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
};

const addAlbumTrackWithFile = async (albumIndex: number) => {
  if (albumCountFromQuiz1.value === 0) {
    ElMessage.warning('Альбомы не выбраны на первом шаге');
    return;
  }
  
  if (albumIndex >= 0 && albumIndex < albums.value.length) {
    const album = albums.value[albumIndex];
    
    // Удаляем эту проверку:
    // if (album.tracks.length >= 20) {
    //   ElMessage.warning('Максимальное количество треков в альбоме - 20');
    //   return;
    // }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPT_TRACK_AUDIO;
    input.multiple = false;
    input.style.display = 'none';
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      isLoadingTwo.value = true;
      
      try {
        if (file.size === 0) {
          throw new Error('Файл имеет 0 байт. Проверьте файл и попробуйте снова.');
        }
        
        if (!isAllowedTrackAudioFile(file)) {
          throw new Error('Недопустимый формат файла');
        }
        
        const fileId = generateAudioId('album', albumIndex, album.tracks.length);
        await saveAudioToDB(file, fileId);
        
        const newTrack: AlbumTrack = {
          id: `album-track-${Date.now()}-${Math.random()}`,
          trackNumber: album.tracks.length + 1,
          trackName: '',
          performerName: album.performerName || '',
          musicAuthor: album.musicAuthor || '',
          textAuthor: album.textAuthor || '',
          audioFile: file,
          audioFileName: file.name,
          audioFileSize: file.size,
          audioFileId: fileId,
          uploaded: true,
          rightsType: '',
          rightsContractLink: '',
          additionalInfo: ''
        };
        
        album.tracks.push(newTrack);
        
        if (!albumErrors.value[albumIndex]) {
          albumErrors.value[albumIndex] = { albumName: '', tracks: [] };
        }
        
        albumErrors.value[albumIndex].tracks.push({
          performerName: '',
          musicAuthor: '',
          textAuthor: '',
          trackName: '',
          audioFile: '',
          rightsType: '',
          rightsContractLink: ''
        });
        
        albums.value = [...albums.value];
        await saveStateToDB();
        
        ElMessage.success(`Трек добавлен в альбом (${album.tracks.length})`);
      } catch (error: any) {
        ElMessage.error(`Ошибка загрузки: ${error.message}`);
      } finally {
        isLoadingTwo.value = false;
      }
    };
    
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }
};

const removeAlbumTrack = async (albumIndex: number, trackIndex: number) => {
  if (albumIndex >= 0 && albumIndex < albums.value.length) {
    const album = albums.value[albumIndex];
    if (trackIndex >= 0 && trackIndex < album.tracks.length) {
      
      if (album.tracks[trackIndex].audioFileId) {
        await removeAudioFromDB(album.tracks[trackIndex].audioFileId);
      }
      
      const newTracks = album.tracks.filter((_, index) => index !== trackIndex);
      
      newTracks.forEach((track, index) => {
        track.trackNumber = index + 1;
      });
      
      album.tracks = newTracks;
      
      if (albumErrors.value[albumIndex]?.tracks) {
        albumErrors.value[albumIndex].tracks = albumErrors.value[albumIndex].tracks.filter((_, index) => index !== trackIndex);
      }
      
      albums.value = [...albums.value];
      await saveStateToDB();
      
      ElMessage.success('Трек удален из альбома');
    }
  }
};

const removeAlbumTrackAudio = async (albumIndex: number, trackIndex: number) => {
  if (albumIndex >= 0 && albumIndex < albums.value.length) {
    const album = albums.value[albumIndex];
    if (trackIndex >= 0 && trackIndex < album.tracks.length) {
      
      if (album.tracks[trackIndex].audioFileId) {
        await removeAudioFromDB(album.tracks[trackIndex].audioFileId);
      }
      
      const newTracks = album.tracks.filter((_, index) => index !== trackIndex);
      
      newTracks.forEach((track, index) => {
        track.trackNumber = index + 1;
      });
      
      album.tracks = newTracks;
      
      if (albumErrors.value[albumIndex]?.tracks) {
        albumErrors.value[albumIndex].tracks = albumErrors.value[albumIndex].tracks.filter((_, index) => index !== trackIndex);
      }
      
      albums.value = [...albums.value];
      await saveStateToDB();
      
      ElMessage.success('Трек удален из альбома');
    }
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const validateSingleOnChange = (trackIndex: number, field: string) => {
  switch (field) {
    case 'performerName':
      validateSinglePerformerName(trackIndex);
      break;
    case 'musicAuthor':
      validateSingleMusicAuthor(trackIndex);
      break;
    case 'textAuthor':
      validateSingleTextAuthor(trackIndex);
      break;
    case 'trackName':
      validateSingleTrackName(trackIndex);
      break;
  }
  saveStateToDB();
};

const validateAlbumTrackOnChange = (albumIndex: number, trackIndex: number, field: string) => {
  switch (field) {
    case 'performerName':
      validateAlbumTrackPerformerName(albumIndex, trackIndex);
      break;
    case 'musicAuthor':
      validateAlbumTrackMusicAuthor(albumIndex, trackIndex);
      break;
    case 'textAuthor':
      validateAlbumTrackTextAuthor(albumIndex, trackIndex);
      break;
    case 'trackName':
      validateAlbumTrackTrackName(albumIndex, trackIndex);
      break;
  }
  saveStateToDB();
};

const openPopup = () => {
  isPopupVisible.value = true;
  document.body.style.overflow = 'hidden';
};

const closePopup = () => {
  isPopupVisible.value = false;
  document.body.style.overflow = '';
};

const goBack = async () => {
  if (showImportantBlock.value) {
    showImportantBlock.value = false;
  } else {
    await saveStateToDB();
    emit('go-back');
  }
};

const handleContinue = async () => {
  let allValid = true;
  
  if (singleCountFromQuiz1.value > 0) {
    for (let i = 0; i < singleTracks.value.length; i++) {
      if (!await validateSingleForm(i)) {
        allValid = false;
      }
    }
  }
  
  if (albumCountFromQuiz1.value > 0) {
    for (let albumIndex = 0; albumIndex < albums.value.length; albumIndex++) {
      for (let trackIndex = 0; trackIndex < albums.value[albumIndex].tracks.length; trackIndex++) {
        if (!await validateAlbumTrackForm(albumIndex, trackIndex)) {
          allValid = false;
        }
      }
    }
  }
  
  if (allValid) {
    await saveStateToDB();
    showImportantBlock.value = true;
  } else {
    ElMessage.error('Пожалуйста, заполните все обязательные поля');
  }
};

const handleAccept = async () => {
  await saveStateToDB();
  emit('go-next');
};

onMounted(async () => {
  try {
    isLoadingTwo.value = true;
    await initDB();
    await loadStateFromDB();
    dataLoaded.value = true;
  } catch (error) {
    console.error('Quiz2: Error in onMounted:', error);
    ElMessage.error('Ошибка при загрузке данных');
  } finally {
    isLoadingTwo.value = false;
  }
});

watch([singleTracks, albums], async () => {
  if (dataLoaded.value && !isLoadingTwo.value && dbInitialized.value) {
    await saveStateToDB();
  }
}, { deep: true });

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', async () => {
    if (dbInitialized.value) {
      await saveStateToDB();
    }
  });

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'hidden' && dbInitialized.value) {
      await saveStateToDB();
    }
  });
}
</script>

<style lang="scss" scoped>
.quiz__form_top {
  display: flex;
  width: 100%;
  padding: 0 0 40px;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 20px;

  @media (max-width: 767px) {
    padding: 0 0 20px;
  }
}

.quiz__additional {
  text-transform: uppercase;
}

.quiz__form_two {
  &_lists {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &_description {
    color: var(--text-gray);
  }

  &_controls {
    display: flex;
    gap: 15px;
    margin: 30px 0;
    flex-wrap: wrap;

    @media (max-width: 767px) {
      margin: 20px 0;

      .button {
        width: 100%;
      }
    }
  }
}

.quiz__form_single_name {
  display: flex;
  width: 100%;
  padding: 20px;
  margin: 0 0 20px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background-color: #EDFBE2;

  &_svg {
    display: flex;
    width: 24px;
    height: 24px;
    cursor: pointer;
    transform: rotate(0deg);
    transition: transform 0.15s linear;

    &:hover {
      transform: rotate(90deg);
    }

    svg {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  &_left {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  &_size {
    color: var(--text-gray);
  }
}

.quiz__form_single_error {
  margin-top: 10px;
  color: #f56c6c;
  padding: 8px 12px;
  background-color: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 4px;
}

.quiz__single {
  &_footer {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }

  &_track_remove {
    background-color: #ff4d4f;
    border-color: #ff4d4f;
  }
}

.quiz__album {
  &_track_footer {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }

  &_track_remove {
    background-color: #ff4d4f;
    border-color: #ff4d4f;
  }

  &_add_track {
    margin-top: 20px;
  }

  &_max_tracks_warning {
    margin-top: 20px;
    text-align: center;
    padding: 10px;
    background-color: #fef0f0;
    border-radius: 4px;
  }
}

.quiz__singles_list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.quiz__add_single_button {
  margin-top: 30px;
  text-align: center;
}

.quiz__upload_waiting {
  text-align: center;
  padding: 60px 20px;
  background-color: var(--bg-color);
  border-radius: 8px;
  margin: 20px 0;

  .loading-spinner {
    display: inline-block;
    width: 40px;
    height: 40px;
    border: 4px solid rgba(64, 158, 255, 0.2);
    border-radius: 50%;
    border-top-color: var(--color);
    animation: spin 1s ease-in-out infinite;
    margin-bottom: 15px;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.warning {
  color: #e6a23c;
}

.quiz__single_item:not(:first-child),
.quiz__album_track_item:not(:first-child) {
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid var(--border);
}

.quiz-popup__overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 80px 20px 20px;
  backdrop-filter: blur(5px);
}

.quiz-popup {
  width: 100%;
  max-width: 600px;
  position: relative;
  background-color: var(--bg);

  &__close {
    display: flex;
    padding: 8px;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 0;
    left: -60px;
    background: var(--bg);
    cursor: pointer;
    color: var(--text);
    border: none;
    z-index: 1002;

    @media (max-width: 767px) {
      top: -60px;
      left: auto;
      right: 0;
      background: var(--bg);
    }

    @media (max-width: 480px) {
      top: -50px;
    }
  }

  &__content {
    max-height: calc(100vh - 100px);
    overflow-y: auto;
    padding: 30px;

    @media (max-width: 767px) {
      padding: 20px;
    }

    @media (max-width: 480px) {
      padding: 15px;
    }
  }

  &__body {
    padding: 0 0 20px;
  }

  &__instruction-block {
    font-size: 16px;
    line-height: 1.6;
    color: #333;

    p {
      margin-bottom: 10px;

      &:first-child {
        font-weight: 600;
        margin-bottom: 5px;
      }

      &:nth-child(2) {
        font-size: 24px;
        text-align: center;
        margin: 15px 0;
      }
    }
  }

  &__footer {
    padding: 20px 0 0;
    text-align: center;

    @media (max-width: 767px) {
      .quiz-popup__button {
        min-width: 160px;
        padding: 12px 24px;
        font-size: 14px;
      }
    }
  }
}

.popup-fade-enter-active,
.popup-fade-leave-active {
  transition: opacity 0.3s ease;
}

.popup-fade-enter-from,
.popup-fade-leave-to {
  opacity: 0;
}
</style>