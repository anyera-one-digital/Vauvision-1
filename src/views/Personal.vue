<template>
<Header></Header>
<section class="personal">
  <div class="container personal__container">
    <Menu />
    <div v-if="loading" class="personal__block">
      <div class="loading__container">
        <div 
          v-loading="loading" 
          :element-loading-svg="loadingSvg" 
          class="loading__svg" 
          element-loading-svg-view-box="-10, -10, 50, 50"
        ></div>
      </div>
    </div>
    <div v-else class="personal__block">
      <div class="personal__balance">
        <div class="personal__balance_top_row">
          <div class="personal__balance_info">
            <h3 class="personal__balance_head">ЛИЧНЫЙ КАБИНЕТ <span class="personal__balance_head_name">{{ personalHeadDisplayName }}</span></h3>
            <p class="personal__lifetime_earnings text_one">
              <span class="personal__lifetime_earnings_label">ЗАРАБОТАНО ЗА ВСЁ ВРЕМЯ:</span>
              <span class="personal__lifetime_earnings_amount">{{ formattedLifetimeEarnings }} {{ profileData.currencySymbol }}</span>
              <span v-if="isLifetimeEarningsHot" class="personal__lifetime_earnings_fire" aria-hidden="true">🔥</span>
            </p>
            <p v-if="viewingArtistBanner" class="personal__artist_banner text_small">{{ viewingArtistBanner }}</p>
          </div>
          <div class="personal__socials">
            <h3 class="personal__balance_head personal__socials_title">ПОДПИСАТЬСЯ НА НАС:</h3>
            <ul class="personal__socials_list">
              <li
                v-for="socialLink in personalSocialLinks"
                :key="socialLink.name"
                class="personal__socials_item"
              >
                <a
                  :href="socialLink.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="personal__socials_link"
                  :aria-label="socialLink.name"
                >
                  <img
                    class="personal__socials_icon"
                    :src="socialLink.icon"
                    :alt="socialLink.name"
                    width="24"
                    height="24"
                    loading="lazy"
                  >
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div class="personal__divider"></div>
        <ul class="personal__balance_list">
          <li class="personal__balance_item">
            <div class="personal__balance_top">
              <div class="personal__balance_svg"><WalletSVG/></div>
              <div class="personal__balance_top_info">
                <h4 class="personal__balance_heading">
                  <span class="personal__balance_description text_one">Баланс</span>
                  {{ profileData.balance.toLocaleString() }} {{ profileData.currencySymbol }}
                </h4>
                <p class="personal__balance_desc text_small">Баланс обновляется после скачивания отчёта. Пожалуйста, скачайте отчёт, после этого сумма на балансе обновится</p>
              </div>
            </div>
            <button 
              class="personal__balance_button button__primary"
              @click="openPayoutAmountPopup"
            >
              <span>Запросить выплаты</span>
            </button>
          </li>
          <li class="personal__balance_item">
            <div class="personal__balance_top">
              <div class="personal__balance_svg"><WalletSVG/></div>
              <div class="personal__balance_top_info">
                <h4 class="personal__balance_heading text_one">Отчёт</h4>
                <!-- <p class="personal__balance_desc"><strong>Отчёт за Q1 2026 задерживается. Он будет доступен к скачиванию не позднее 28 мая. Приносим извинения за задержку!</strong></p> -->
              </div>
            </div>
            <button 
              class="personal__balance_button button__black" 
              :class="{ 'button__disabled': !showReportButton }"
              :disabled="!showReportButton"
              @click="showReportPopupFunc"
            >
              <span><DownloadSVG/>Скачать отчёт</span>
            </button>
          </li>
          <li class="personal__balance_item">
            <div class="personal__balance_top">
              <div class="personal__balance_svg"><PaySVG/></div>
              <div class="personal__balance_top_info">
                <h4 class="personal__balance_heading">
                  <span class="personal__balance_description text_one">Бонусы партнера</span>
                  {{ profileData.bonus.toLocaleString() }}
                </h4>
                <p class="personal__balance_desc text_small">Бонусы начисляются за каждую покупку, а также за рекомендации по Партнёрской программе!<br>Бонусами можно оплачивать до 50% покупок.<br>{{ bonusBalanceHintLine }}</p>
              </div>
            </div>
            <button 
              class="personal__balance_button button__primary"
              @click="openBonusPayoutPopup"
              :disabled="profileData.bonus <= 0"
              :class="{ 'button__disabled': profileData.bonus <= 0 }"
              style="display: none;"
            >
              <span>Запросить выплаты бонусов</span>
            </button>
          </li>
        </ul>
      </div>
      <div class="personal__flex">
        <div class="personal__content">
          <div class="personal__release">
            <div class="personal__release_flex">
              <h5 class="personal__release_head">ОТПРАВИТЬ РЕЛИЗ НА ПЛОЩАДКИ</h5>
              <p class="personal__release_desc">Нажмите на кнопку ниже, чтобы заполнить форму и отправить свой релиз на все платформы!</p>
            </div>
            <RouterLink class="personal__release_button button__red button" :to="Tr.i18nRoute({ name: 'release' })">
              <span>Выложить релиз</span>
            </RouterLink>
          </div>
          <div class="personal__releases">
            <div class="personal__releases_block">
              <h5 class="personal__releases_title">ВАШИ РЕЛИЗЫ</h5>
              <ul class="personal__releases_list">
                <li 
                  class="personal__releases_item" 
                  v-for="release in paginatedReleases" 
                  :key="release.id"
                >
                  <div class="personal__releases_information">
                    <!-- <div class="personal__releases_image">
                      <img 
                        v-if="release.image"
                        :src="release.image"
                        @error="handleImageError"
                        alt=""
                      >
                      <div v-else class="personal__releases_image_placeholder"></div>
                    </div> -->
                    <div class="personal__releases_flex">
                      <div class="personal__releases_top">
                        <h5 class="personal__releases_head"><span>{{ releaseTypeLabel(release) }}</span> {{ release.name }}</h5>
                        <p class="personal__releases_album text_small"></p>
                      </div>
                      <p class="personal__releases_date text_small">Дата релиза: {{ release.propertyDateRelizValue ? release.propertyDateRelizValue.split('-').reverse().join('.') : release.date.split(' ')[0]  }}</p>
                    </div>
                  </div>
                  <div class="personal__releases_info">
                    <div class="personal__releases_top">
                      <h5 class="personal__releases_head"><span>{{ releaseTypeLabel(release) }}</span> {{ release.name }}</h5>
                      <p class="personal__releases_album text_small"></p>
                    </div>
                    <!-- Блок с кодами и ссылкой -->
                    <div class="personal__releases_codes">
                        <!-- UPC код -->
                        <div 
                          v-if="release.upcCode && release.upcCode !== 'Нет данных'" 
                          class="personal__releases_code text_small"
                          @click="copyToClipboard(release.upcCode, 'UPC')"
                        >
                          <span>UPC: {{ release.upcCode }}</span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor"/>
                          </svg>
                        </div>
                        <div 
                          v-else
                          class="personal__releases_code personal__releases_code_action text_small"
                          @click="handleUpcClick(release)"
                        >
                          <span>UPC: {{ getUpcDisplayText(release) }}</span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
                          </svg>
                        </div>

                        <!-- Ссылка на релиз -->
                        <div 
                          v-if="release.link && release.link !== 'Нет данных'" 
                          class="personal__releases_code text_small"
                          @click="copyToClipboard(release.link, 'Ссылка')"
                        >
                          <!-- <LinkSVG/> -->
                          <span>Ссылка: {{ release.link }}</span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor"/>
                          </svg>
                        </div>
                        <div
                          v-else
                          class="personal__releases_code personal__releases_code_action text_small"
                          role="button"
                          tabindex="0"
                          @click="handleReleaseLinkPlaceholderClick(release)"
                          @keydown.enter.prevent="handleReleaseLinkPlaceholderClick(release)"
                        >
                          <span>Ссылка: {{ getReleaseLinkPlaceholderLabel(release) }}</span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
                          </svg>
                        </div>
                        <!-- ISRC код для релиза (если нет треков) -->
                        <RouterLink 
                          v-if="(!release.tracks || release.tracks.length === 0) && !isReleaseDayReached(release)"
                          :to="Tr.i18nRoute({ name: 'support' })"
                          class="personal__releases_code personal__releases_code_action text_small"
                        >
                          <span>ISRC: уточнить в поддержке</span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
                          </svg>
                        </RouterLink>
                        <a
                          v-else-if="(!release.tracks || release.tracks.length === 0)"
                          href="https://musicfetch.io/isrc-finder"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="personal__releases_code personal__releases_code_action text_small"
                        >
                          <span>ISRC: узнать</span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor"/>
                          </svg>
                        </a>
                    </div>

                    <!-- Блок с треками релиза -->
                    <div class="personal__releases_tracks" v-if="release.tracks && release.tracks.length > 0">
                      <h6 class="personal__tracks_title">Треки:</h6>
                      <ul class="personal__tracks_list">
                        <li 
                          v-for="(track, trackIndex) in release.tracks" 
                          :key="track.id || trackIndex"
                          class="personal__tracks_item"
                        >
                          <div class="personal__tracks_number">{{ trackIndex + 1 }}</div>
                          <div class="personal__tracks_info">
                            <div class="personal__tracks_name text_small">{{ track.title }}</div>
                              <!-- ISRC код для трека -->
                              <div class="personal__tracks_isrc text_very">
                                <span v-if="track.isrc && track.isrc !== 'Нет данных'">
                                  ISRC: {{ track.isrc }}
                                </span>
                                <RouterLink 
                                  v-else-if="!isReleaseDayReached(release)"
                                  :to="Tr.i18nRoute({ name: 'support' })"
                                  class="personal__tracks_isrc_link text_very"
                                >
                                  <LinkSVG v-if="!track.fromTrackProperty" class="personal__tracks_link_svg" />
                                  <span>ISRC: уточнить в поддержке</span>
                                </RouterLink>
                                <a
                                  v-else
                                  href="https://musicfetch.io/isrc-finder"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  class="personal__tracks_isrc_link text_very"
                                >
                                  <LinkSVG v-if="!track.fromTrackProperty" class="personal__tracks_link_svg" />
                                  <span>ISRC: узнать</span>
                                </a>
                              </div>
                          </div>
                        </li>
                      </ul>
                    </div>
                    
                    <div class="personal__releases_bottom">
                      <p class="personal__releases_date text_small">Дата релиза: {{ release.propertyDateRelizValue ? release.propertyDateRelizValue.split('-').reverse().join('.') : release.date.split(' ')[0]  }}</p>
                      <div class="personal__releases_agreements">
                        <a 
                          v-if="release.contractFile" 
                          :href="release.contractFile" 
                          class="personal__releases_agreement button" 
                          download=""
                        >
                          <DownloadSVG/><span>Скачать договор</span>
                        </a>
                        <!--a 
                          v-if="release.contractFile" 
                          :href="release.contractFile" 
                          class="personal__releases_agreement button" 
                          target="_blank"
                        >
                          <EyeSVG/><span>Открыть договор</span>
                        </a -->
                      </div>
                    </div>
                  </div>
                  <div class="personal__releases_services">
                    <a
                      class="personal__releases_service_button"
                      href="https://vauvision.com/stories/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span>Видео для сториз</span>
                    </a>
                    <div
                      class="personal__releases_service_button"
                      @click="handleReleaseServiceComingSoon"
                    >
                      <span>Запуск рекламы</span>
                    </div>
                  </div>
                </li>
              </ul>
              <div class="pagination__buttons" v-if="showReleasesPagination">
                <button 
                  class="pagination__buttons_button button button__pagination button__pagination_prev"
                  @click="prevReleasesPage"
                  :disabled="currentReleasesPage === 1 || isLoadingReleases"
                >
                  <span><ButtonSVG /></span>
                  <span>{{$t('button.prev')}}</span>
                </button>
                
                <div class="pagination__buttons_info">
                  {{ currentReleasesPage }}/{{ totalReleasesPages }}
                </div>
                
                <button 
                  class="pagination__buttons_button button button__pagination button__pagination_next"
                  @click="nextReleasesPage"
                  :disabled="currentReleasesPage === totalReleasesPages || isLoadingReleases"
                >
                  <span>{{$t('button.next')}}</span>
                  <span><ButtonSVG /></span>
                </button>
              </div>
            </div>
          </div>
          <div class="personal__reports">
            <div class="personal__reports_top">
              <h5 class="personal__reports_head">Ранее полученные отчёты</h5>
              <p class="personal__reports_desc">Новый отчёт нужно скачать через кнопку «Скачать отчёт» вверху страницы</p>
            </div>
            <ul class="personal__reports_list">
              <li class="personal__reports_item personal__reports_header">
                <div class="personal__reports_cell personal__reports_info text_small">Отчёт</div>
                <div class="personal__reports_cell personal__reports_date text_small">Дата</div>
                <div class="personal__reports_cell personal__reports_actions text_small"></div>
              </li>
              <li 
                class="personal__reports_item" 
                v-for="report in paginatedReports" 
                :key="report.id"
              >
                <div class="personal__reports_cell personal__reports_info">
                  <div class="personal__reports_image"><ReportsSVG /></div>
                  <div class="personal__reports_file text_small">
                    <span class="personal__reports_filename">{{ report.filename }}</span>
                    <span class="personal__reports_filesize">{{ report.filesize }}</span>
                  </div>
                </div>
                <div class="personal__reports_cell personal__reports_date text_small">
                  <span class="personal__reports_datevalue">{{ report.date }}</span>
                </div>
                <div class="personal__reports_cell personal__reports_actions">
                  <div class="personal__reports_buttons text_small">
                    <a 
                      v-if="report.xlsxUrl"
                      :href="getFullUrl(report.xlsxUrl)" 
                      class="personal__reports_button text_small" 
                      download=""
                    >
                      <DownloadSVG/>
                      <span>Скачать XLSX</span>
                    </a>
                    
                    <a 
                      v-if="report.pdfUrl"
                      :href="getFullUrl(report.pdfUrl)" 
                      class="personal__reports_button text_small" 
                      download=""
                    >
                      <DownloadSVG/>
                      <span>Скачать PDF</span>
                    </a>
                    
                    <a 
                      :href="getFullUrl(`/acts/${report.id}`)" 
                      class="personal__reports_button text_small"
                      v-if="report.hasAct"
                      @click="scheduleTransactionsRefreshAfterActDownload"
                      download=""
                    >
                      <DownloadSVG/>
                      <span>Скачать акт</span>
                    </a>
                  </div>
                </div>
              </li>
            </ul>
            <div v-if="paginatedReports.length === 0 && !isLoadingReports" class="personal__reports_empty">
              <p class="personal__reports_empty_text">Нет доступных отчётов</p>
            </div>
            <div class="pagination__buttons" v-if="showReportsPagination">
              <button 
                class="pagination__buttons_button button button__pagination button__pagination_prev"
                @click="prevReportsPage"
                :disabled="currentReportsPage === 1 || isLoadingReports"
              >
                <span><ButtonSVG /></span>
                <span>{{$t('button.prev')}}</span>
              </button>
              
              <div class="pagination__buttons_info">
                {{ currentReportsPage }}/{{ totalReportsPages }}
              </div>
              
              <button 
                class="pagination__buttons_button button button__pagination button__pagination_next"
                @click="nextReportsPage"
                :disabled="currentReportsPage === totalReportsPages || isLoadingReports"
              >
                <span>{{$t('button.next')}}</span>
                <span><ButtonSVG /></span>
              </button>
            </div>
          </div>
          <div class="personal__transactions">
            <h5 class="personal__transactions_head">Финансовые транзакции</h5>
            <ul class="personal__transactions_list">
              <li class="personal__transactions_item personal__transactions_header">
                <div class="personal__transactions_cell personal__transactions_type text_small">Тип транзакции</div>
                <div class="personal__transactions_cell personal__transactions_date text_small">Дата</div>
                <div class="personal__transactions_cell personal__transactions_period text_small">Период</div>
                <div class="personal__transactions_cell personal__transactions_status text_small">Статус</div>
                <div class="personal__transactions_cell personal__transactions_amount text_small">Сумма</div>
              </li>
              <li 
                class="personal__transactions_item" 
                v-for="transaction in paginatedTransactions" 
                :key="transaction.id"
              >
                <div class="personal__transactions_cell personal__transactions_type">
                  <div class="personal__transactions_image"><TransactionSVG /></div>
                  <span class="personal__transactions_typevalue text_small">{{ transaction.type }}</span>
                </div>
                <div class="personal__transactions_cell personal__transactions_date">
                  <span class="personal__transactions_datevalue text_small">{{ transaction.date }}</span>
                </div>
                <div class="personal__transactions_cell personal__transactions_period">
                  <span class="personal__transactions_periodvalue text_small">{{ transaction.period }}</span>
                </div>
                <div class="personal__transactions_cell personal__transactions_status">
                  <span 
                    class="personal__transactions_statusvalue text_small"
                    :class="getStatusClass(transaction.status)"
                  >
                    {{ getStatusText(transaction.status) }}
                  </span>
                </div>
                <div class="personal__transactions_cell personal__transactions_amount">
                  <span class="personal__transactions_amountvalue text_small">{{ transaction.amount }}</span>
                </div>
              </li>
            </ul>
            <div v-if="paginatedTransactions.length === 0 && !isLoadingTransactions" class="personal__transactions_empty">
              <p class="personal__transactions_empty_text">Нет доступных транзакций</p>
            </div>
            <div class="pagination__buttons" v-if="showTransactionsPagination">
              <button 
                class="pagination__buttons_button button button__pagination button__pagination_prev"
                @click="prevTransactionsPage"
                :disabled="currentTransactionsPage === 1 || isLoadingTransactions"
              >
                <span><ButtonSVG /></span>
                <span>{{$t('button.prev')}}</span>
              </button>
              
              <div class="pagination__buttons_info">
                {{ currentTransactionsPage }}/{{ totalTransactionsPages }}
              </div>
              
              <button 
                class="pagination__buttons_button button button__pagination button__pagination_next"
                @click="nextTransactionsPage"
                :disabled="currentTransactionsPage === totalTransactionsPages || isLoadingTransactions"
              >
                <span>{{$t('button.next')}}</span>
                <span><ButtonSVG /></span>
              </button>
            </div>
          </div>
        </div>
        <div class="personal__right">
          <div class="personal__partner">
            <div class="personal__partner_image">
              <img src="@/assets/img/personal/partner/partner.webp" alt="">
            </div>
            <div class="personal__partner_info">
              <h5 class="personal__articles_head">Стать партнёром VAUVISION</h5>
              <p class="personal__articles_desc">Зарабатывайте деньги за рекомендации!</p>
            </div>
            <RouterLink class="personal__partner_button button button__primary" :to="Tr.i18nRoute({ name: 'partner' })">
              <span>Присоединиться</span>
            </RouterLink>
          </div>
          <div class="personal__articles">
            <div class="personal__articles_top">
              <h5 class="personal__articles_head">Cтатьи</h5>
              <RouterLink class="personal__articles_all button" :to="Tr.i18nRoute({ name: 'articles' })">
                Смотреть больше
              </RouterLink>
            </div>
            <ul class="personal__articles_list">
              <li 
                class="personal__articles_item" 
                v-for="article in lastThreeArticles" 
                :key="article.url"
              >
                <a :href="article.url" class="personal__articles_link">
                  <div class="personal__articles_image">
                    <img 
                      :src="getFullUrl(article.img)" 
                      :alt="article.name"
                      @error="handleImageError"
                    >
                  </div>
                  <div class="personal__articles_info">
                    <p class="personal__articles_head text_small">{{ article.name }}</p>
                    <p class="personal__articles_date text_small">Читать статью</p>
                  </div>
                </a>
              </li>
              <li v-if="lastThreeArticles.length === 0" class="personal__articles_item">
                <div class="personal__articles_link">
                  <div class="personal__articles_image">
                    <div class="articles__image_placeholder"></div>
                  </div>
                  <div class="personal__articles_info">
                    <p class="personal__articles_head text_small">Статьи временно недоступны</p>
                  </div>
                </div>
              </li>
            </ul>
          </div>
          <div class="personal__partners">
            <div class="personal__partners_top">
              <h5 class="personal__partners_head">Партнеры</h5>
              <RouterLink class="personal__partners_all button" :to="Tr.i18nRoute({ name: 'partner' })">Смотреть больше</RouterLink>
            </div>
            <ul class="personal__partners_list">
              <li 
                class="personal__partners_item" 
                v-for="partner in lastThreePartners" 
                :key="partner.id"
              >
                <a href="#" target="_blank" class="personal__partners_link">
                  <p class="personal__partners_heading button">{{ partner.name }}</p>
                  <p class="personal__partners_desc text_small">{{ partner.email }} • {{ partner.date }}</p>
                </a>
              </li>
              <li v-if="lastThreePartners.length === 0" class="personal__partners_item">
                <div class="personal__partners_link">
                  <p class="personal__partners_heading button">Нет партнеров</p>
                  <p class="personal__partners_desc text_small">Пригласите друзей</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
<!-- Попап для подтверждения перед скачиванием отчёта -->
<Teleport to="body">
  <div class="popup" v-if="showConfirmReportPopup" @click.self="closeAllPopups">
    <div class="popup__content popup__content_small">
      <div class="popup__header">
        <h5 class="popup__title">Скачать отчёт</h5>
        <button class="popup__close" @click="closeAllPopups">×</button>
      </div>
      <div class="popup__body">
        <div class="popup__info-message">
          Перед скачиванием отчёта, пожалуйста, убедитесь, что у вас в настройках указаны верные реквизиты
        </div>
        
        <div class="popup__actions popup__actions_two_buttons">
          <RouterLink :to="Tr.i18nRoute({ name: 'setting' })" class="popup__button button button__black">
            <span>Настройки</span>
          </RouterLink>
          <button 
            class="popup__button button button__primary"
            @click="proceedToReportDownload"
          >
            <span>Скачать отчёт</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</Teleport>

<!-- Попап выбора типа ссылки релиза -->
<Teleport to="body">
  <div class="popup" v-if="showSmartlinkTypePopup" @click.self="closeAllPopups">
    <div class="popup__content popup__content_small">
      <div class="popup__header">
        <h5 class="popup__title">Какую ссылку создать?</h5>
        <button class="popup__close" @click="closeAllPopups">×</button>
      </div>
      <div class="popup__body popup__smartlink-body">
        <el-select
          v-model="selectedSmartlinkType"
          class="popup__smartlink-select"
          popper-class="popup-select-popper"
        >
          <el-option label="Смартлинк VAUVISION" value="vauvision" />
          <el-option label="Пресейв BandLink" value="bandlink" />
        </el-select>
        <p class="popup__smartlink-hint">
          <template v-if="selectedSmartlinkType === 'vauvision'">
            Страница со всеми площадками на нашем домене.
          </template>
          <template v-else>
            Страница band.link с пресейвом — для ещё не вышедших релизов.
          </template>
        </p>
        <div class="popup__actions popup__actions_two_buttons">
          <button class="popup__button button button__black" @click="closeAllPopups">
            <span>Отмена</span>
          </button>
          <button class="popup__button button button__red" @click="confirmSmartlinkType">
            <span>Создать ссылку</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</Teleport>
<!-- Попап для выбора года -->
<Teleport to="body">
  <div class="popup" v-if="showReportPopup" @click.self="closeAllPopups">
    <div class="popup__content">
      <div class="popup__header">
        <h5 class="popup__title">Выберите год отчёта</h5>
        <button class="popup__close" @click="closeAllPopups">×</button>
      </div>
      <div class="popup__body">
        <div class="popup__years" v-if="reportYears.length > 0">
          <!-- Заменяем обычный select на el-select -->
          <el-select
            v-model="selectedYear"
            placeholder="Выберите год"
            :disabled="isLoadingQuarters"
            @change="selectYear"
            class="popup__year-select"
            popper-class="popup-select-popper"
          >
            <el-option
              v-for="year in reportYears"
              :key="year"
              :label="year"
              :value="year"
            />
          </el-select>
          <div v-if="isLoadingQuarters" class="popup__loading-select">
            Загрузка кварталов...
          </div>
        </div>
        <div v-else class="popup__empty">
          <p>Нет доступных отчётов</p>
          <p class="popup__empty_hint">Попробуйте позже или обратитесь в поддержку</p>
        </div>
      </div>
    </div>
  </div>
</Teleport>

<!-- Попап для сообщения "Нет доступных отчётов" -->
<Teleport to="body">
  <div class="popup" v-if="showNoReportsPopup" @click.self="closeAllPopups">
    <div class="popup__content popup__content_small">
      <div class="popup__header">
        <h5 class="popup__title">Нет доступных отчётов</h5>
        <button class="popup__close" @click="closeAllPopups">×</button>
      </div>
      <div class="popup__body">
        <div class="popup__empty">
          <p>На данный момент нет доступных отчётов</p>
          <p class="popup__empty_hint">Отчёты приходят раз в квартал после 25 числа:</p>
          <p class="popup__empty_hint">
            <ul class="popup__empty_list">
              <li> В мае приходит отчёт за Q1 (первый квартал: дек-янв-фев)</li>
              <li> В августе приходит отчёт за Q2 (второй квартал: мар-апр-май)</li>
              <li> В ноябре приходит отчёт за Q3 (третий квартал: июн-июл-авг)</li>
              <li> В феврале приходит отчёт за Q4 (четвёртый квартал: сен-окт-ноя)</li>
            </ul> 
          </p>
          <p class="popup__empty_hint">Пожалуйста, попробуйте позже или обратитесь в нашу поддержку.</p>
        </div>
        <div class="popup__actions">
          <button 
            class="popup__button button button__black"
            @click="closeAllPopups"
          >
            <span>Закрыть</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</Teleport>

<!-- Попап для выбора квартала -->
<Teleport to="body">
  <div class="popup" v-if="showQuarterPopup" @click.self="closeAllPopups">
    <div class="popup__content">
      <div class="popup__header">
        <button class="popup__back" @click="backToYearSelection">← Назад</button>
        <h5 class="popup__title">Выберите квартал</h5>
        <button class="popup__close" @click="closeAllPopups">×</button>
      </div>
      <div class="popup__body">
        <p class="popup__year-selected">Год: {{ selectedYear }}</p>
        
        <div v-if="isLoadingQuarters" class="popup__loading">
          Загрузка кварталов...
        </div>
        
        <div v-else-if="availableQuarters.length > 0" class="popup__quarters">
          <button 
            v-for="quarter in availableQuarters" 
            :key="quarter.id"
            class="popup__quarter-button popup__button button button__black"
            :class="{ 'active': selectedQuarter === quarter.id }"
            @click="toggleQuarter(quarter.id)"
          >
            <span class="quarter__months">{{ quarter.name }} ({{ quarter.months }})</span>
          </button>
        </div>

        <div v-if="isDownloading" class="popup__download-status">
          <div class="popup__download-spinner" aria-hidden="true"></div>
          <p class="popup__download-text">{{ reportDownloadStatusText }}</p>
          <div
            class="popup__download-progressbar"
            role="progressbar"
            aria-label="Прогресс формирования отчёта"
            :aria-valuemin="0"
            :aria-valuemax="100"
            :aria-valuenow="reportDownloadProgress"
          >
            <div
              class="popup__download-progressfill"
              :style="{ width: `${reportDownloadProgress}%` }"
            ></div>
          </div>
          <p class="popup__download-progressvalue">{{ reportDownloadProgress }}%</p>
        </div>
        
        <div
          v-if="!isLoadingQuarters && availableQuarters.length === 0 && !isDownloading"
          class="popup__empty"
        >
          <p>Нет доступных кварталов</p>
          <p class="popup__empty_hint">Для выбранного года нет отчётов</p>
        </div>
        
        <button 
          class="popup__download-button button button__primary"
          :disabled="!selectedQuarter || isLoadingQuarters || isDownloading"
          @click="downloadReport"
        >
          <span>{{ isDownloading ? 'Загрузка...' : 'Скачать отчёт' }}</span>
        </button>
      </div>
    </div>
  </div>
</Teleport>

<!-- Попап при недостаточном балансе для выплаты -->
<Teleport to="body">
  <div class="popup" v-if="showLowBalancePopup" @click.self="closeAllPopups">
    <div class="popup__content popup__content_small">
      <div class="popup__header">
        <h5 class="popup__title">Доступно к выводу</h5>
        <button class="popup__close" @click="closeAllPopups">×</button>
      </div>
      <div class="popup__body popup__low-balance-body">
        <p class="popup__low-balance-value">
          {{ profileData.balance.toLocaleString() }} {{ profileData.currencySymbol }}
        </p>
        <p class="popup__low-balance-text">
          {{ lowBalanceHintText }}
          <br>
          Приносим извинения за неудобства.
        </p>
        <div class="popup__actions popup__low-balance-actions">
          <button class="popup__button button button__primary" @click="closeAllPopups">
            <span>Понятно</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</Teleport>

<!-- Попап для запроса выплаты -->
<Teleport to="body">
  <div class="popup" v-if="showPayoutAmountPopup" @click.self="closeAllPopups">
    <div class="popup__content popup__content_small">
      <div class="popup__header">
        <h5 class="popup__title">Запрос выплаты</h5>
        <button class="popup__close" @click="closeAllPopups">×</button>
      </div>
      <div class="popup__body">
        <div class="popup__info">
          <p class="popup__balance-info">
            Сумма к выплате: <strong>{{ profileData.balance.toLocaleString() }} {{ profileData.currencySymbol }}</strong>
          </p>
          <!-- <p class="popup__min-amount">
            Минимальная сумма: <strong>{{ minPayoutAmount }} {{ profileData.currencySymbol }}</strong>
          </p> -->
        </div>
        
        <div class="popup__form-group">
          <p v-if="!isCommissionNoticeVisible" class="popup__info-message">
            Будет запрошена выплата на сумму {{ profileData.balance.toLocaleString() }} {{ profileData.currencySymbol }}
          </p>
          <div v-if="isCommissionNoticeVisible" class="popup__commission-block">
            <p class="popup__commission-text">
              <!-- На выплаты свыше 20 000 мы берём комиссию в 5% от суммы для покрытия издержек на банковские транзакции физлицам. Рекомендуем вам открыть ИП и обновить реквизиты. -->
              Вы заработали значительную сумму! 🔥
              <br><br>
              При ваших доходах банки могут взимать дополнительную комиссию за вывод средств на данные физ. лица в размере 5% от суммы.
              <br><br>
              Пожалуйста, при наличии реквизитов ИП, укажите реквизиты вашего ИП в разделе «Настройки» и запросите выплату на них. Таким образом, дополнительной комиссии не будет. 
              <br><br>
              Если у вас нет ИП, то настоятельно рекомендуем открыть его и пользоваться им для вывода средств в будущем.
            </p>
            <div class="popup__actions popup__actions_two_buttons popup__commission-actions">
              <button
                class="popup__button button button__black"
                @click="goToBankRequisitesSettings"
                :disabled="isRequestingAct"
              >
                <span>Сменить реквизиты</span>
              </button>
              <button
                class="popup__button button button__primary"
                @click="requestPayoutAct"
                :disabled="isRequestingAct"
              >
                <span v-if="!isRequestingAct">Вывести с комиссией</span>
                <span v-else>Запрос...</span>
              </button>
            </div>
          </div>
          <p
            v-if="actError"
            class="popup__error-message"
            v-html="safeActError"
          ></p>
        </div>
        
        <div class="popup__actions">
          <button 
            v-if="!isCommissionNoticeVisible"
            class="popup__button button button__primary"
            @click="requestPayoutByRegion"
            :disabled="isRequestingAct"
          >
            <span v-if="!isRequestingAct">{{ payoutPrimaryActionLabel }}</span>
            <span v-else>Запрос...</span>
          </button>
          <button 
            class="popup__button button button__black"
            @click="closeAllPopups"
            :disabled="isRequestingAct"
          >
            <span>Отмена</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</Teleport>

<!-- Попап для отображения изображений -->
<Teleport to="body">
  <div class="popup" v-if="showImagesPopup && actData" @click.self="closeAllPopups">
    <div class="popup__content popup__content_images">
      <div class="popup__header">
        <h5 class="popup__title">Изображения акта</h5>
        <button class="popup__close" @click="closeAllPopups">×</button>
      </div>
      <div class="popup__body">
        <p class="popup__images-info">Акт успешно создан. Просмотрите изображения:</p>
        
        <div class="popup__images-grid" v-if="actData.images && actData.images.length > 0">
          <a
            v-for="(image, index) in actData.images"
            :key="index"
            :href="getFullUrl(image)"
            class="popup__image-item"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="`Открыть изображение акта ${index + 1} в новой вкладке`"
          >
            <img
              :src="getFullUrl(image)"
              :alt="`Изображение ${index + 1}`"
              class="popup__image"
            >
            <span class="popup__image-hint">Нажмите на картинку для полноэкранного просмотра в новой вкладке</span>
          </a>
        </div>
        
        <div v-else class="popup__empty">
          Нет изображений для отображения
        </div>
        
        <div class="popup__actions">
          <button 
            class="popup__button button button__primary"
            @click="goToSignature"
          >
            <span>Перейти к подписи</span>
          </button>
          <button 
            class="popup__button button button__black"
            @click="closeAllPopups"
          >
            <span>Отмена</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</Teleport>

<!-- Попап для подписи акта -->
<SignaturePopup
  v-if="showSignaturePopup && actData"
  @close="closeAllPopups"
  @submit="submitSignature"
/>

<!-- Попап для выплаты бонусов -->
<Teleport to="body">
  <div class="popup" v-if="showBonusPayoutPopup" @click.self="closeBonusPayoutPopup">
    <div class="popup__content popup__content_small">
      <div class="popup__header">
        <h5 class="popup__title">Запрос выплаты бонусов</h5>
        <button class="popup__close" @click="closeBonusPayoutPopup">×</button>
      </div>
      <div class="popup__body">
        <div class="popup__info">
          <p class="popup__balance-info">
            Доступно бонусов: <strong>{{ profileData.bonus.toLocaleString() }}</strong>
          </p>
        </div>
        
        <div class="popup__form-group">
          <label for="bonus-amount" class="popup__label">
            Введите сумму для выплаты:
          </label>
          <input
            id="bonus-amount"
            type="number"
            class="popup__input"
            :class="{ 'popup__input_error': payoutError }"
            v-model.number="bonusPayoutAmount"
            :min="1"
            :max="maxBonusAmount"
            :placeholder="`От 1 до ${maxBonusAmount}`"
            :disabled="isSubmittingBonusPayout"
            @keyup.enter="submitBonusPayout"
          />
          <p v-if="payoutError" class="popup__error-message">{{ payoutError }}</p>
        </div>
        
        <div class="popup__actions">
          <button 
            class="popup__button button button__primary"
            @click="submitBonusPayout"
            :disabled="!isBonusAmountValid || isSubmittingBonusPayout"
          >
            <span v-if="!isSubmittingBonusPayout">Отправить запрос</span>
            <span v-else>Отправка...</span>
          </button>
          <button 
            class="popup__button button button__black"
            @click="closeBonusPayoutPopup"
            :disabled="isSubmittingBonusPayout"
          >
            <span>Отмена</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</Teleport>

<!-- Попап об успешном запросе выплаты -->
<Teleport to="body">
  <div class="popup" v-if="showPayoutSuccessPopup" @click.self="closeAllPopups">
    <div class="popup__content popup__content_small">
      <div class="popup__header">
        <h5 class="popup__title">ВЫ ЗАПРОСИЛИ ВЫПЛАТУ</h5>
        <button class="popup__close" @click="closeAllPopups">×</button>
      </div>
      <div class="popup__body">
        <p class="popup__info-message">
          Успешно! Выплата поступит вам на указанные реквизиты в ближайшее время, но не позже 10 рабочих дней.
          Статус и сроки выплат вы можете уточнить у нас в поддержке.
        </p>
        <div class="popup__actions">
          <button class="popup__button button button__primary" @click="closeAllPopups">
            <span>Хорошо, жду!</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</Teleport>

</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from 'element-plus';
import DOMPurify from "dompurify";
import { sendRequest } from '@/utils/api';
import { fetchSharedCabinetGetData } from '@/utils/fetchSharedCabinetGetData';
import Header from "@/components/layout/Header.vue";
// import Footer from "@/components/layout/Footer.vue";
import Menu from "@/components/layout/Menu.vue";
import DownloadSVG from "@/uikit/icon/DownloadSVG.vue";
// import EyeSVG from "@/uikit/icon/EyeSVG.vue";
import LinkSVG from "@/uikit/icon/LinkSVG.vue";
import WalletSVG from "@/uikit/icon/WalletSVG.vue";
import PaySVG from "@/uikit/icon/PaySVG.vue";
import ReportsSVG from "@/uikit/icon/ReportsSVG.vue";
import TransactionSVG from "@/uikit/icon/TransactionSVG.vue";
import ButtonSVG from "@/uikit/icon/ButtonSVG.vue";
import socialVkIcon from "@/assets/img/personal/social/vk.svg";
import socialTelegramIcon from "@/assets/img/personal/social/telegram.svg";
import socialInstagramIcon from "@/assets/img/personal/social/black.png";
import socialMaxIcon from "@/assets/img/personal/social/max.svg";
import socialYoutubeIcon from "@/assets/img/personal/social/youtube.svg";
import socialRutubeIcon from "@/assets/img/personal/social/Icon_RUTUBE_dark_mono.svg";
import socialDzenIcon from "@/assets/img/personal/social/dzen-icon-logo.svg";
import Tr from "@/i18n/translation"
import SignaturePopup from "@/components/layout/Signature.vue";
import {
  isLabelOwner,
  labelArtists,
  labelCabinetPseudonym,
  registerLabelArtistsExternalRefresh,
  syncLabelMenuFromGetDataResponse,
} from "@/composables/labelArtistsMenu";

const loading = ref<boolean>(true);
const loadingSvg = `
  <path class="path" d="
    M 30 15
    L 28 17
    M 25.61 25.61
    A 15 15, 0, 0, 1, 15 30
    A 15 15, 0, 1, 1, 27.99 7.5
    L 15 15
  " style="stroke-width: 4px; fill: rgba(0, 0, 0, 0)"/>
`;

const loadedCount = ref(0);
const API_BASE_URL = window.location.origin;

// Интерфейсы
interface Track {
  id: number;
  title: string;
  duration: number;
  track_number: number;
  isrc?: string;
  lyrics?: string;
  artist?: string[];
  composer?: string;
  lyricist?: string;
  is_explicit?: boolean;
  // Добавляем поле для отслеживания состояния
  isrcStatus?: 'loading' | 'error' | 'success';
  /** Трек из свойства Bitrix TRACK (без JSON Zvonko): без иконки у строки ISRC */
  fromTrackProperty?: boolean;
}

interface Release {
  id: string | number;
  name: string;
  date: string;
  releaseType?: string;
  image?: string;
  upcCode?: string;
  link?: string;
  contractFile?: string | null;
  hasPng?: boolean;
  previewText?: string | null;
  propertyDateRelizValue?: string;
  propertyDopValue?: string | null;
  propertyNewDocxValue?: string;
  propertyDogovorUserValue?: string | null;
  propertyDogovorPdfValue?: string | null;
  propertyLinkValue?: string | null;
  propertyDogovorStatusValue?: string | null;
  tracks?: Track[];
}

interface Report {
  id: string | number;
  filename: string;
  filesize: string;
  /** Размер в байтах с бэка (getData.php); строка filesize может быть выведена из него */
  filesizeBytes?: number | null;
  date: string;
  hasAct: boolean;
  xlsxUrl?: string;
  pdfUrl?: string | null;
  images?: string[];
}

interface Transaction {
  id: number;
  type: string;
  date: string;
  period: string | null;
  status: 'completed' | 'processing' | 'cancelled';
  amount: string;
  currency?: string;
}

interface Article {
  img: string;
  name: string;
  url: string;
}

interface Partner {
  id: number;
  name: string;
  email: string;
  date: string;
  earnings: string;
  releases: string;
}

interface Quarter {
  id: string;
  name: string;
  months: string;
}

interface SocialLink {
  name: string;
  href: string;
  icon: string;
}

interface ActResponse {
  docx_url: string;
  pdf_url: string;
  images: string[];
  element_id: string;
  message: string;
}

// Данные из API
const profileData = ref({
  balance: 0,
  bonus: 0,
  region: 'Russia',
  currency: 'RUB' as 'RUB' | 'USD',
  currencySymbol: '₽'
});

const bonusBalanceHintLine = computed(() =>
  profileData.value.region === 'Russia'
    ? '1 бонус = 1 рубль.'
    : '100 бонусов = 1,3 $'
);

const personalSocialLinks: SocialLink[] = [
  { name: 'VK', href: 'https://vk.com/vauvisionlabel', icon: socialVkIcon },
  { name: 'Telegram', href: 'https://t.me/vauvisionbusiness', icon: socialTelegramIcon },
  { name: 'Instagram', href: 'https://instagram.com/vauvision', icon: socialInstagramIcon },
  { name: 'MAX', href: 'https://max.ru/join/t_kzt6jqx5-l1r0IESewfIKzVUUWgvy2ISt5SDU2CUQ', icon: socialMaxIcon },
  { name: 'YouTube', href: 'https://youtube.com/vauvision', icon: socialYoutubeIcon },
  { name: 'Rutube', href: 'https://rutube.ru/channel/24675933/', icon: socialRutubeIcon },
  { name: 'Dzen', href: 'https://dzen.ru/vauvisionbusiness', icon: socialDzenIcon },
];

function transactionCurrencySuffix(explicit?: string): string {
  const t = (explicit ?? '').toString().trim();
  if (t) return t;
  return profileData.value.currencySymbol;
}

interface MenuBalanceApi {
  updateBalance?: (newBalance: number) => void;
  refreshUserData?: () => Promise<void> | void;
}

interface HeaderBalanceApi {
  updateBalance?: (newBalance: number, currencySymbol?: string) => void;
  refreshUserData?: () => Promise<void> | void;
}

const syncBalanceWithSideMenu = async () => {
  const shellApis = window as Window & {
    __menuApi?: MenuBalanceApi;
    __headerApi?: HeaderBalanceApi;
  };
  const menuApi = shellApis.__menuApi;
  if (typeof menuApi?.updateBalance === 'function') {
    menuApi.updateBalance(profileData.value.balance);
  }

  if (typeof menuApi?.refreshUserData === 'function') {
    await Promise.resolve(menuApi.refreshUserData());
  }

  const headerApi = shellApis.__headerApi;
  if (typeof headerApi?.updateBalance === "function") {
    headerApi.updateBalance(
      profileData.value.balance,
      profileData.value.currencySymbol
    );
  }
  if (typeof headerApi?.refreshUserData === "function") {
    await Promise.resolve(headerApi.refreshUserData());
  }

  window.dispatchEvent(
    new CustomEvent("cabinet-balance-updated", {
      detail: {
        balance: profileData.value.balance,
        currencySymbol: profileData.value.currencySymbol,
      },
    })
  );
};

const userName = ref<string>('');
/** Заголовок ЛК: псевдоним из ростера лейбла / логин getData, иначе имя как раньше */
const personalHeadDisplayName = computed(() => {
  const fromLabel = labelCabinetPseudonym.value.trim();
  if (fromLabel) return fromLabel;
  const n = userName.value.trim();
  return n || "Пользователь";
});
const route = useRoute();
const router = useRouter();

// ========================= TEMP QA PAYOUT BLOCK START =========================
// Временный QA-режим для ручной проверки состояний попапа выплат через query-параметры.
// Примеры:
// ?qaPayout=1&qaBalance=25000&qaIp=0
// ?qaPayout=1&qaBalance=25000&qaIp=1
// ?qaPayout=1&qaPayoutSuccess=1
// Удаляется целиком вместе с блоком между START/END комментариями.
const qaPayoutModeEnabled = computed(() => route.query.qaPayout === '1');

const parseQaNumber = (value: unknown): number | null => {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const applyQaPayoutOverrides = () => {
  if (!qaPayoutModeEnabled.value) return;

  const qaBalance = parseQaNumber(route.query.qaBalance);
  if (qaBalance !== null) {
    profileData.value.balance = qaBalance;
  }

  const qaIp = route.query.qaIp;
  if (qaIp === '1') {
    hasEntrepreneurRequisites.value = true;
  } else if (qaIp === '0') {
    hasEntrepreneurRequisites.value = false;
  }

  if (route.query.qaPayoutSuccess === '1') {
    closeAllPopups();
    showPayoutSuccessPopup.value = true;
    document.documentElement.classList.add('noscroll');
    return;
  }

  if (!showPayoutAmountPopup.value) {
    payoutAmount.value = profileData.value.balance;
    actError.value = '';
    showPayoutAmountPopup.value = true;
    document.documentElement.classList.add('noscroll');
  }
};
// ========================== TEMP QA PAYOUT BLOCK END ==========================

const viewingArtistBanner = computed(() => {
  const id = route.query.artist;
  if (!id || typeof id !== 'string') return '';
  const fromApi = labelArtists.value.find((a) => a.id === id);
  return fromApi ? `Просмотр кабинета артиста: ${fromApi.pseudonym}` : "";
});
const showReportButton = ref(false);
const reportYears = ref<string[]>([]);
const selectedYear = ref<string>('');
const selectedQuarter = ref<string>('');
const showReportPopup = ref(false);
const showQuarterPopup = ref(false);
const showSignaturePopup = ref(false);
const showPayoutAmountPopup = ref(false);
const showLowBalancePopup = ref(false);
const showImagesPopup = ref(false);
const showNoReportsPopup = ref(false);
const showPayoutSuccessPopup = ref(false);
// Попап выбора типа создаваемой ссылки (смартлинк VAUVISION / пресейв BandLink)
const showSmartlinkTypePopup = ref(false);
const smartlinkTypeRelease = ref<Release | null>(null);
const selectedSmartlinkType = ref<SmartlinkMode>('vauvision');
const actData = ref<ActResponse | null>(null);
const userLabel = computed(() => (isLabelOwner.value ? 1 : 0));
const showConfirmReportPopup = ref(false);

const payoutAmount = ref<number | null>(null);
const isRequestingAct = ref(false);
const actError = ref('');
const safeActError = computed(() =>
  DOMPurify.sanitize(actError.value, {
    ALLOWED_TAGS: ["br", "strong", "div", "ul", "ol", "span", "li"],
    ALLOWED_ATTR: [],
  })
);

const isSubmittingVyplata = ref(false);
const vyplataError = ref('');
const hasEntrepreneurRequisites = ref(false);
const canWithdrawFromThousand = ref(false);

const availableQuarters = ref<Quarter[]>([]);

const releasesData = ref<Release[]>([]);
const reportsData = ref<Report[]>([]);
const lifetimeEarningsTotal = ref(0);
const transactionsData = ref<Transaction[]>([]);
const articlesData = ref<Article[]>([]);
const partnersData = ref<Partner[]>([]);
const financialStatusRefreshDelaysMs = [1200, 3200, 7000] as const;
let financialStatusRefreshTimers: Array<ReturnType<typeof setTimeout>> = [];
let reportDownloadProgressTimer: ReturnType<typeof setInterval> | null = null;
let reportDownloadDelayMessageTimer: ReturnType<typeof setTimeout> | null = null;

const isLoadingReleases = ref(false);
const isLoadingReports = ref(false);
const isLoadingTransactions = ref(false);
const isLoadingQuarters = ref(false);
const isDownloading = ref(false);
const reportDownloadProgress = ref(0);
const isReportDownloadDelayMessageVisible = ref(false);
const loadingYear = ref<string | null>(null); // Состояние загрузки для кнопки года

const releasesPagination = ref({
  currentPage: 1,
  perPage: 6,
  total: "0"
});

const reportsPagination = ref({
  currentPage: 1,
  perPage: 4,
  total: "0"
});

const transactionsPagination = ref({
  currentPage: 1,
  perPage: 4,
  total: "0"
});

const releasesPerPage = ref<number>(6);
const currentReleasesPage = ref<number>(1);
const totalReleasesItems = computed(() => parseInt(releasesPagination.value.total) || 0);

const reportsPerPage = ref<number>(4);
const currentReportsPage = ref<number>(1);
const totalReportsItems = computed(() => parseInt(reportsPagination.value.total) || 0);

const transactionsPerPage = ref<number>(4);
const currentTransactionsPage = ref<number>(1);
const totalTransactionsItems = computed(() => parseInt(transactionsPagination.value.total) || 0);

/** Страницы релизов по total и perPage из ответа getData (на бэке 6), а не по устаревшему локальному ref. */
const totalReleasesPages = computed(() => {
  const per = releasesPagination.value.perPage || releasesPerPage.value || 1;
  return Math.max(1, Math.ceil(totalReleasesItems.value / per));
});

const paginatedReleases = computed(() => {
  return releasesData.value;
});

const showReleasesPagination = computed(() => {
  const per = releasesPagination.value.perPage || releasesPerPage.value || 1;
  return totalReleasesItems.value > per;
});

const totalReportsPages = computed(() => {
  const per = reportsPagination.value.perPage || reportsPerPage.value || 1;
  return Math.max(1, Math.ceil(totalReportsItems.value / per));
});

const paginatedReports = computed(() => {
  return reportsData.value;
});

const showReportsPagination = computed(() => {
  const per = reportsPagination.value.perPage || reportsPerPage.value || 1;
  return totalReportsItems.value > per;
});

const totalTransactionsPages = computed(() => {
  const per =
    transactionsPagination.value.perPage || transactionsPerPage.value || 1;
  return Math.max(1, Math.ceil(totalTransactionsItems.value / per));
});

const paginatedTransactions = computed(() => {
  return transactionsData.value;
});

const showTransactionsPagination = computed(() => {
  const per =
    transactionsPagination.value.perPage || transactionsPerPage.value || 1;
  return totalTransactionsItems.value > per;
});

const lastThreeArticles = computed(() => {
  return articlesData.value.slice(0, 3);
});

const lastThreePartners = computed(() => {
  return partnersData.value.slice(0, 3);
});

const showBonusPayoutPopup = ref(false);
const bonusPayoutAmount = ref<number | null>(null);
const isSubmittingBonusPayout = ref(false);
const payoutError = ref('');

const maxBonusAmount = computed(() => profileData.value.bonus || 0);
const isBonusAmountValid = computed(() => {
  if (!bonusPayoutAmount.value) return false;
  return bonusPayoutAmount.value > 0 && bonusPayoutAmount.value <= maxBonusAmount.value;
});

const toBooleanFlag = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'y' || normalized === 'yes' || normalized === 'true';
  }
  return false;
};

const minPayoutAmount = computed(() => {
  if (!isRussianRegion.value) return 10;
  return canWithdrawFromThousand.value ? 1000 : 5000;
});

const isCommissionNoticeVisible = computed(() => {
  return profileData.value.region === 'Russia'
    && Number(profileData.value.balance || 0) >= 20000
    && !hasEntrepreneurRequisites.value;
});

const isPayoutAmountValid = computed(() => {
  // Всегда валидно, так как сумма автоматически равна максимальному балансу
  return true;
});

const isRussianRegion = computed(() => profileData.value.region === 'Russia');
const lifetimeEarningsThreshold = computed(() =>
  isRussianRegion.value ? 100000 : 10000
);
const formattedLifetimeEarnings = computed(() =>
  formatLifetimeEarnings(lifetimeEarningsTotal.value)
);
const isLifetimeEarningsHot = computed(
  () => lifetimeEarningsTotal.value > lifetimeEarningsThreshold.value
);
const lowBalanceHintText = computed(() =>
  isRussianRegion.value
    ? `Для вывода средств нужно, чтобы сумма была ${minPayoutAmount.value} рублей и больше. Пожалуйста, запросите выплату позже, когда накопится нужная сумма.`
    : 'Для вывода средств нужно, чтобы сумма была 10 долларов и больше. Пожалуйста, запросите выплату позже, когда накопится нужная сумма.'
);
const payoutPrimaryActionLabel = computed(() =>
  isRussianRegion.value ? 'Получить акт' : 'Получить выплаты'
);
const reportDownloadStatusText = computed(() =>
  isReportDownloadDelayMessageVisible.value
    ? 'Сервис сейчас обрабатывает большое количество заявок. Время ожидания может быть увеличено на неопределённый срок. Приносим извинения'
    : 'Отчёт формируется, это может занять несколько минут. Пожалуйста, не закрывайте это окно.'
);

const nextReleasesPage = async () => {
  if (currentReleasesPage.value < totalReleasesPages.value) {
    await fetchReleasesPage(currentReleasesPage.value + 1);
  }
};

const prevReleasesPage = async () => {
  if (currentReleasesPage.value > 1) {
    await fetchReleasesPage(currentReleasesPage.value - 1);
  }
};

const nextReportsPage = async () => {
  if (currentReportsPage.value < totalReportsPages.value) {
    await fetchReportsPage(currentReportsPage.value + 1);
  }
};

const prevReportsPage = async () => {
  if (currentReportsPage.value > 1) {
    await fetchReportsPage(currentReportsPage.value - 1);
  }
};

const nextTransactionsPage = async () => {
  if (currentTransactionsPage.value < totalTransactionsPages.value) {
    await fetchTransactionsPage(currentTransactionsPage.value + 1);
  }
};

const prevTransactionsPage = async () => {
  if (currentTransactionsPage.value > 1) {
    await fetchTransactionsPage(currentTransactionsPage.value - 1);
  }
};

const toggleQuarter = (quarterId: string) => {
  if (selectedQuarter.value === quarterId) {
    selectedQuarter.value = '';
  } else {
    selectedQuarter.value = quarterId;
  }
};

const stopReportDownloadProgress = () => {
  if (reportDownloadProgressTimer !== null) {
    clearInterval(reportDownloadProgressTimer);
    reportDownloadProgressTimer = null;
  }
};

const stopReportDownloadDelayMessageTimer = () => {
  if (reportDownloadDelayMessageTimer !== null) {
    clearTimeout(reportDownloadDelayMessageTimer);
    reportDownloadDelayMessageTimer = null;
  }
  isReportDownloadDelayMessageVisible.value = false;
};

const startReportDownloadProgress = () => {
  stopReportDownloadProgress();
  stopReportDownloadDelayMessageTimer();
  reportDownloadProgress.value = 8;

  reportDownloadDelayMessageTimer = setTimeout(() => {
    isReportDownloadDelayMessageVisible.value = true;
  }, 120000);

  reportDownloadProgressTimer = setInterval(() => {
    if (reportDownloadProgress.value >= 95) {
      stopReportDownloadProgress();
      return;
    }

    const step = reportDownloadProgress.value < 60
      ? 7
      : reportDownloadProgress.value < 85
        ? 4
        : 2;

    reportDownloadProgress.value = Math.min(
      95,
      reportDownloadProgress.value + step
    );
  }, 900);
};

const completeReportDownloadProgress = async () => {
  stopReportDownloadProgress();
  stopReportDownloadDelayMessageTimer();
  reportDownloadProgress.value = 100;
  await new Promise((resolve) => setTimeout(resolve, 220));
};

const getFullUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

const getCurrentDate = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/** Дата выхода: PROPERTY_DATE_RELIZ (YYYY-MM-DD), иначе начало DATE_CREATE (DD.MM.YYYY). */
const getReleaseDate = (release: Release): Date | null => {
  const pri = release.propertyDateRelizValue?.trim();
  if (pri) {
    const iso = pri.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      const dt = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
      dt.setHours(0, 0, 0, 0);
      return dt;
    }
  }
  const raw = release.date?.trim();
  if (!raw) return null;
  const dm = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dm) {
    const dt = new Date(Number(dm[3]), Number(dm[2]) - 1, Number(dm[1]));
    dt.setHours(0, 0, 0, 0);
    return dt;
  }
  return null;
};

/** День выхода наступил (сегодня или раньше); без разбираемой даты — false → поддержка / не musicfetch. */
const isReleaseDayReached = (release: Release): boolean => {
  const d = getReleaseDate(release);
  if (!d) return false;
  return d <= getCurrentDate();
};

/** Разворачивает ответ Bitrix: несколько значений ZVONKO_TRACK_JSON и вложенные массивы */
const flattenZvonkoTrackRows = (raw: unknown): any[] => {
  if (raw == null) return [];
  if (typeof raw === 'string') {
    try {
      return flattenZvonkoTrackRows(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) {
    const out: any[] = [];
    for (const el of raw) {
      if (Array.isArray(el)) out.push(...flattenZvonkoTrackRows(el));
      else if (el && typeof el === 'object') out.push(el);
    }
    return out;
  }
  if (typeof raw === 'object') return [raw];
  return [];
};

const normalizeTrackDisplayTitle = (rawTitle: unknown): string => {
  const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';
  if (!title) return '';
  const numbered = title.replace(/^\d+\.\s*/, '');
  const parts = numbered.split(/\s[–\-—]\s+/u);
  if (parts.length >= 2) {
    return parts.slice(1).join(' - ').trim();
  }
  return numbered;
};

const normalizeReleaseType = (rawType: unknown): 'single' | 'album' | '' => {
  const value = typeof rawType === 'string' ? rawType.trim().toLowerCase() : '';
  if (value === 'single' || value === 'album') return value;
  return '';
};

const resolveReleaseType = (item: any): 'single' | 'album' => {
  const releaseType = normalizeReleaseType(item?.RELEASE_TYPE ?? item?.releaseType);
  if (releaseType) return releaseType;
  const trackRows = flattenZvonkoTrackRows(item?.PROPERTY_ZVONKO_TRACK_JSON);
  if (trackRows.length > 1) return 'album';
  if (Array.isArray(item?.TRACK_IDS) && item.TRACK_IDS.length > 1) return 'album';
  if (Array.isArray(item?.tracks) && item.tracks.length > 1) return 'album';
  return 'single';
};

const releaseTypeLabel = (release: Release): string =>
  resolveReleaseType(release) === 'album' ? 'Альбом' : 'Сингл';

// Функция для извлечения треков из данных API
const extractTracks = (item: any): Track[] => {
  let tracks: Track[] = [];

  if (item.PROPERTY_ZVONKO_TRACK_JSON) {
    try {
      const rows = flattenZvonkoTrackRows(item.PROPERTY_ZVONKO_TRACK_JSON);
      tracks = rows.map((track: any) => ({
        id: track.id,
        title: normalizeTrackDisplayTitle(track.title),
        duration: track.duration ?? 0,
        track_number: track.track_number ?? 0,
        isrc: track.isrc,
        lyrics: track.lyrics,
        artist: track.artist,
        composer: track.composer,
        lyricist: track.lyricist,
        is_explicit: track.is_explicit,
      }));
    } catch (e) {
      console.error('Ошибка парсинга треков:', e);
    }
  }

  // Без Zvonko: названия из свойства TRACK (GetData)
  if (tracks.length === 0) {
    const names = item.TRACK;
    const ids = item.TRACK_IDS;
    if (Array.isArray(names) && names.length > 0) {
      tracks = names.map((title: string, i: number) => ({
        id:
          Array.isArray(ids) && ids[i] != null && ids[i] !== ''
            ? Number(ids[i])
            : i + 1,
        title: normalizeTrackDisplayTitle(title),
        duration: 0,
        track_number: i + 1,
        fromTrackProperty: true,
      }));
    }
  }

  tracks.sort((a, b) => (a.track_number || 0) - (b.track_number || 0));

  return tracks;
};

/** Ссылка для блока релиза: смарт-ссылка Zvonko либо ручное свойство PROPERTY_LINK. */
const pickReleaseDisplayLink = (item: any): string => {
  const smart =
    item.PROPERTY_ZVONKO_ALBUM_JSON?.smart_link?.url ??
    item.PROPERTY_ZVONKO_SMART_LINK_URL_VALUE ??
    item.link;
  const manual = item.PROPERTY_LINK_VALUE;
  for (const c of [smart, manual]) {
    if (typeof c === 'string') {
      const t = c.trim();
      if (t && t !== 'Нет данных') return t;
    }
  }
  return '';
};

const fetchReleasesPage = async (page: number) => {
  isLoadingReleases.value = true;
  try {
    const response = await sendRequest('get', `/ajax_vue/ajax/getData.php?PAGEN_1=${page}`, {});
    
    if (response.data && response.data.releases) {
      releasesData.value = response.data.releases.items.map((item: any) => ({
        id: item.ID || item.id,
        name: item.NAME || item.name,
        date: item.DATE_CREATE || item.date,
        image: item.PROPERTY_ZVONKO_ALBUM_JSON?.image || item.image,
        upcCode: item.PROPERTY_ZVONKO_ALBUM_JSON?.upc || item.upc,
        link: pickReleaseDisplayLink(item),
        contractFile: item.CONTRACT_FILE ? getFullUrl(item.CONTRACT_FILE) : null,
        hasPng: item.HAS_PNG,
        previewText: item.PREVIEW_TEXT,
        releaseType: normalizeReleaseType(item.RELEASE_TYPE),
        propertyDateRelizValue: item.PROPERTY_DATE_RELIZ_VALUE,
        propertyDopValue: item.PROPERTY_DOP_VALUE,
        propertyNewDocxValue: item.PROPERTY_NEW_DOCX_VALUE,
        propertyDogovorUserValue: item.PROPERTY_DOGOVOR_USER_VALUE,
        propertyDogovorPdfValue: item.PROPERTY_DOGOVOR_PDF_VALUE ? getFullUrl(item.PROPERTY_DOGOVOR_PDF_VALUE) : null,
        propertyLinkValue: item.PROPERTY_LINK_VALUE,
        propertyDogovorStatusValue: item.PROPERTY_DOGOVOR_STATUS_VALUE,
        tracks: extractTracks(item)
      }));
      
      releasesPagination.value = {
        currentPage: response.data.releases.currentPage || page,
        perPage: response.data.releases.perPage || releasesPerPage.value,
        total: response.data.releases.total || "0"
      };
      
      currentReleasesPage.value = releasesPagination.value.currentPage;
    }
  } catch (error) {
    console.error('Ошибка при загрузке релизов:', error);
  } finally {
    isLoadingReleases.value = false;
  }
};

const fetchReportsPage = async (page: number) => {
  isLoadingReports.value = true;
  try {
    const response = await sendRequest('get', `/ajax_vue/ajax/getData.php?report_page=${page}`, {});
    
    if (response.data && response.data.downloadedReports) {
      reportsData.value = response.data.downloadedReports.items.map((item: any) =>
        mapReportItem(item)
      );
      
      reportsPagination.value = {
        currentPage: response.data.downloadedReports.currentPage || page,
        perPage: response.data.downloadedReports.perPage || reportsPerPage.value,
        total: response.data.downloadedReports.totalItems?.toString() || "0"
      };
      
      currentReportsPage.value = reportsPagination.value.currentPage;
    }
  } catch (error) {
    console.error('Ошибка при загрузке отчётов:', error);
  } finally {
    isLoadingReports.value = false;
  }
};

const fetchTransactionsPage = async (page: number) => {
  isLoadingTransactions.value = true;
  try {
    const response = await sendRequest('get', `/ajax_vue/ajax/getData.php?PAGEN_2=${page}`, {});
    
    if (response.data && response.data.finances) {
      transactionsData.value = response.data.finances.items.map((item: any, index: number) =>
        mapTransactionItem(item, index)
      );
      
      transactionsPagination.value = {
        currentPage: response.data.finances.currentPage || page,
        perPage: response.data.finances.perPage || transactionsPerPage.value,
        total: response.data.finances.total || "0"
      };
      
      currentTransactionsPage.value = transactionsPagination.value.currentPage;
    }
  } catch (error) {
    console.error('Ошибка при загрузке транзакций:', error);
  } finally {
    isLoadingTransactions.value = false;
  }
};

const getStatusClass = (status: string) => {
  switch (status) {
    case 'completed':
      return 'status_completed';
    case 'processing':
      return 'status_processing';
    case 'cancelled':
      return 'status_cancelled';
    default:
      return '';
  }
};

const normalizeTransactionStatus = (rawStatus: unknown): Transaction['status'] => {
  const normalized = String(rawStatus ?? '').trim().toLowerCase();

  if (
    normalized === 'завершено' ||
    normalized === 'выполнен' ||
    normalized === 'выполнено' ||
    normalized === 'выполнена'
  ) {
    return 'completed';
  }

  if (
    normalized === 'отменено' ||
    normalized === 'отменен' ||
    normalized === 'отклонено' ||
    normalized === 'отклонен'
  ) {
    return 'cancelled';
  }

  return 'processing';
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'completed':
      return 'Завершено';
    case 'processing':
      return 'В обработке';
    case 'cancelled':
      return 'Отменено';
    default:
      return status;
  }
};

const selectYear = async (year: string) => {
  selectedYear.value = year;
  loadingYear.value = year; // Устанавливаем загрузку только для выбранной кнопки
  
  isLoadingQuarters.value = true;
  
  try {
    const response = await sendRequest('post', '/ajax_vue/ajax/profile/kvartal.php', {
      ID: year
    });
    
    console.log('Ответ с кварталами (JSON):', response.data);
    
    // Обрабатываем JSON ответ
    if (response.data && response.data.error === 0 && response.data.data && response.data.data.quarters) {
      availableQuarters.value = response.data.data.quarters.map((quarter: any) => ({
        id: quarter.value,
        name: quarter.value, // Q1, Q2, Q3, Q4
        months: quarter.label.replace(quarter.value, '').replace(/[()]/g, '').trim() // "июнь, июль, август"
      }));
    } else {
      // Если нет кварталов, показываем пустой массив
      availableQuarters.value = [];
      if (response.data && response.data.message) {
        console.warn('Нет кварталов:', response.data.message);
      }
    }
    
    console.log('Обработанные кварталы:', availableQuarters.value);
    
    if (availableQuarters.value.length > 0) {
      showReportPopup.value = false;
      showQuarterPopup.value = true;
    } else {
      alert('Для выбранного года нет доступных кварталов');
    }
    
  } catch (error) {
    console.error('Ошибка при загрузке кварталов:', error);
    alert('Не удалось загрузить список кварталов');
    availableQuarters.value = [];
  } finally {
    isLoadingQuarters.value = false;
    loadingYear.value = null; // Снимаем загрузку с кнопки
  }
};

const downloadReport = async () => {
  if (!selectedQuarter.value) {
    alert('Пожалуйста, выберите квартал');
    return;
  }

  loading.value = true;
  isDownloading.value = true;
  startReportDownloadProgress();
  let reportRequestSucceeded = false;
  try {
    const requestData = {
      LABLE_1: userLabel.value,
      QUARTER_ID: selectedQuarter.value,
      YEAR_ID: selectedYear.value
    };
    
    const response = await fetch('/ajax_vue/ajax/profile/report.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });
    
    const data = await response.json();
    console.log('Ответ от сервера:', data);
    
    // Проверяем, есть ли ссылка в поле error или message
    let downloadUrl = null;
    
    if (data.error && typeof data.error === 'string' && (data.error.startsWith('http') || data.error.startsWith('/'))) {
      // Если error содержит ссылку
      downloadUrl = data.error;
    } else if (data.message && typeof data.message === 'string' && (data.message.startsWith('http') || data.message.startsWith('/'))) {
      // Если message содержит ссылку
      downloadUrl = data.message;
    } else if (data.data && data.data.url) {
      // Если ссылка в data.url
      downloadUrl = data.data.url;
    }
    
    if (downloadUrl) {
      reportRequestSucceeded = true;
      // Скачиваем файл
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = ''; // Это заставит браузер скачать файл, а не открывать его
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await completeReportDownloadProgress();
      closeAllPopups();

      await fetchProfileData();
      await fetchReports();
      scheduleFinancialStatusesRefresh();
      
      // Показываем сообщение об успешной загрузке
      ElMessage({
        message: 'Отчёт успешно скачивается',
        type: 'success',
        duration: 3000,
        showClose: true
      });
    } else {
      // Если ссылки нет, показываем сообщение об ошибке
      const errorMessage = data.message || data.error || 'Не удалось получить ссылку для скачивания';
      alert(errorMessage);
    }
    
  } catch (error) {
    console.error('Ошибка при запросе:', error);
    alert('Произошла ошибка при запросе');
  } finally {
    if (!reportRequestSucceeded) {
      stopReportDownloadProgress();
    }
    stopReportDownloadDelayMessageTimer();
    reportDownloadProgress.value = 0;
    isDownloading.value = false;
    loading.value = false;
  }
};

const clearFinancialStatusRefreshTimers = () => {
  financialStatusRefreshTimers.forEach((timer) => clearTimeout(timer));
  financialStatusRefreshTimers = [];
};

const scheduleFinancialStatusesRefresh = (includeProfile = false) => {
  clearFinancialStatusRefreshTimers();

  financialStatusRefreshTimers = financialStatusRefreshDelaysMs.map((delay, index) =>
    setTimeout(async () => {
      try {
        await fetchTransactions();
        if (includeProfile && index === 0) {
          await fetchProfileData();
        }
      } catch (error) {
        console.error('Ошибка при обновлении статусов финансовых транзакций:', error);
      }
    }, delay)
  );
};

const scheduleTransactionsRefreshAfterActDownload = () => {
  // Даем бэкенду время обновить фазу заявки после скачивания.
  scheduleFinancialStatusesRefresh(true);
};

const showReportPopupFunc = () => {
  if (!showReportButton.value) {
    alert('Кнопка скачивания отчёта недоступна');
    return;
  }
  
  // Открываем попап с подтверждением
  showConfirmReportPopup.value = true;
  document.documentElement.classList.add('noscroll');
};

// Продолжить скачивание отчёта
const proceedToReportDownload = () => {
  closeAllPopups();
  
  // Проверяем наличие годов для отчёта
  if (reportYears.value.length === 0) {
    showNoReportsPopup.value = true;
    document.documentElement.classList.add('noscroll');
    return;
  }
  
  showReportPopup.value = true;
  document.documentElement.classList.add('noscroll');
};

const closeAllPopups = () => {
  showReportPopup.value = false;
  showQuarterPopup.value = false;
  showSignaturePopup.value = false;
  showBonusPayoutPopup.value = false;
  showPayoutAmountPopup.value = false;
  showLowBalancePopup.value = false;
  showImagesPopup.value = false;
  showNoReportsPopup.value = false;
  showPayoutSuccessPopup.value = false;
  showConfirmReportPopup.value = false; // Добавьте эту строку
  showSmartlinkTypePopup.value = false;
  smartlinkTypeRelease.value = null;
  selectedYear.value = '';
  selectedQuarter.value = '';
  availableQuarters.value = [];
  actData.value = null;
  actError.value = '';
  payoutAmount.value = null;
  vyplataError.value = '';
  loadingYear.value = null;
  stopReportDownloadProgress();
  stopReportDownloadDelayMessageTimer();
  reportDownloadProgress.value = 0;
  document.documentElement.classList.remove('noscroll');
};

const backToYearSelection = () => {
  showQuarterPopup.value = false;
  showReportPopup.value = true;
  selectedQuarter.value = '';
  selectedYear.value = '';
  availableQuarters.value = [];
  stopReportDownloadProgress();
  stopReportDownloadDelayMessageTimer();
  reportDownloadProgress.value = 0;
};

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
  const parent = img.parentElement;
  if (parent) {
    const placeholder = document.createElement('div');
    placeholder.className = 'personal__releases_image_placeholder';
    parent.appendChild(placeholder);
  }
};

const fetchProfileData = async (prefetched?: Record<string, unknown>) => {
  try {
    const data = (prefetched ?? (await fetchSharedCabinetGetData()).data) as
      | Record<string, unknown>
      | undefined;
    if (!data) {
      return undefined;
    }

    hasEntrepreneurRequisites.value = false;
    canWithdrawFromThousand.value = toBooleanFlag(data.isoldsumm);

    const user = data.user as Record<string, unknown> | undefined;
    if (user) {
      userName.value = (user.name as string) || (user.login as string) || 'Пользователь';
    }

    if (data.profile) {
      const prof = data.profile as Record<string, unknown>;
      profileData.value.balance = (prof.balance as number) || 0;
      profileData.value.bonus = (prof.bonus as number) || 0;
      profileData.value.region = (prof.region as string) || 'Russia';
      profileData.value.currency =
        (prof.currency as 'RUB' | 'USD') ||
        (profileData.value.region === 'Russia' ? 'RUB' : 'USD');
      profileData.value.currencySymbol =
        (prof.currencySymbol as string) ||
        (profileData.value.region === 'Russia' ? '₽' : '$');
      showReportButton.value = !!prof.showReportButton;
    }

    await syncBalanceWithSideMenu();

    const settings = data.settings as Record<string, unknown> | undefined;
    const requisites = settings?.requisites as Record<string, unknown> | undefined;
    const entrepreneur = requisites?.entrepreneur as Record<string, unknown> | undefined;
    if (entrepreneur) {
      const entrepreneurFields = [
        entrepreneur.fullName,
        entrepreneur.ogrnip,
        entrepreneur.inn,
        entrepreneur.account,
        entrepreneur.bankName,
      ];
      hasEntrepreneurRequisites.value = entrepreneurFields.some((field) =>
        String(field ?? '').trim().length > 0
      );
    }

    applyQaPayoutOverrides();

    syncLabelMenuFromGetDataResponse(data);

    const years = data.reportYears;
    if (years && Array.isArray(years)) {
      reportYears.value = years as string[];
    }

    return data;
  } catch (error) {
    console.error('Ошибка при загрузке профиля:', error);
    throw error;
  }
};

const fetchReleases = async () => {
  try {
    const response = await fetchSharedCabinetGetData();
    const data = response.data as Record<string, unknown> | undefined;
    const releases = data?.releases as Record<string, unknown> | undefined;
    const items = releases?.items;
    if (items && Array.isArray(items)) {
      releasesData.value = items.map((item: any) => ({
        id: item.ID || item.id,
        name: item.NAME || item.name,
        date: item.DATE_CREATE || item.date,
        image: item.PROPERTY_ZVONKO_ALBUM_JSON?.image || item.image,
        upcCode: item.PROPERTY_ZVONKO_ALBUM_JSON?.upc || item.upc,
        link: pickReleaseDisplayLink(item),
        contractFile: item.CONTRACT_FILE ? getFullUrl(item.CONTRACT_FILE) : null,
        hasPng: item.HAS_PNG,
        previewText: item.PREVIEW_TEXT,
        releaseType: normalizeReleaseType(item.RELEASE_TYPE),
        propertyDateRelizValue: item.PROPERTY_DATE_RELIZ_VALUE,
        propertyDopValue: item.PROPERTY_DOP_VALUE,
        propertyNewDocxValue: item.PROPERTY_NEW_DOCX_VALUE,
        propertyDogovorUserValue: item.PROPERTY_DOGOVOR_USER_VALUE,
        propertyDogovorPdfValue: item.PROPERTY_DOGOVOR_PDF_VALUE ? getFullUrl(item.PROPERTY_DOGOVOR_PDF_VALUE) : null,
        propertyLinkValue: item.PROPERTY_LINK_VALUE,
        propertyDogovorStatusValue: item.PROPERTY_DOGOVOR_STATUS_VALUE,
        tracks: extractTracks(item)
      }));
      
      releasesPagination.value = {
        currentPage: (releases.currentPage as number) || 1,
        perPage: (releases.perPage as number) || releasesPerPage.value,
        total: (releases.total as string) || "0"
      };
      currentReleasesPage.value = releasesPagination.value.currentPage;
    }
  } catch (error) {
    console.error('Ошибка при загрузке релизов:', error);
    throw error;
  }
};

const fetchReports = async () => {
  try {
    const response = await fetchSharedCabinetGetData();
    const data = response.data as Record<string, unknown> | undefined;
    const downloaded = data?.downloadedReports as Record<string, unknown> | undefined;
    const repItems = downloaded?.items;
    if (repItems && Array.isArray(repItems)) {
      reportsData.value = repItems.map((item: any) => mapReportItem(item));
      
      reportsPagination.value = {
        currentPage: (downloaded.currentPage as number) || 1,
        perPage: (downloaded.perPage as number) || reportsPerPage.value,
        total: (downloaded.totalItems as number | string | undefined)?.toString() || "0"
      };
      currentReportsPage.value = reportsPagination.value.currentPage;
    }
  } catch (error) {
    console.error('Ошибка при загрузке отчётов:', error);
    throw error;
  }
};

const fetchTransactions = async () => {
  try {
    const response = await fetchSharedCabinetGetData();
    const data = response.data as Record<string, unknown> | undefined;
    const finances = data?.finances as Record<string, unknown> | undefined;
    const finItems = finances?.items;
    if (finItems && Array.isArray(finItems)) {
      transactionsData.value = finItems.map((item: any, index: number) =>
        mapTransactionItem(item, index)
      );
      
      transactionsPagination.value = {
        currentPage: (finances.currentPage as number) || 1,
        perPage: (finances.perPage as number) || transactionsPerPage.value,
        total: (finances.total as string) || "0"
      };
      currentTransactionsPage.value = transactionsPagination.value.currentPage;
      await refreshLifetimeEarningsFromFinances(finances, finItems as Record<string, unknown>[]);
    } else {
      lifetimeEarningsTotal.value = 0;
    }
  } catch (error) {
    console.error('Ошибка при загрузке транзакций:', error);
    throw error;
  }
};

const fetchArticles = async () => {
  try {
    const response = await sendRequest('get', '/ajax_vue/ajax/getData.php?articles', {});
    if (response.data && response.data.articles) {
      articlesData.value = response.data.articles;
    } else {
      articlesData.value = [];
    }
  } catch (error) {
    console.error('Ошибка при загрузке статей:', error);
    articlesData.value = [];
    throw error;
  }
};

const fetchPartners = async () => {
  try {
    const partnerResponse = await sendRequest('get', '/ajax_vue/ajax/getData.php?referral', {});
    if (partnerResponse.data && partnerResponse.data.profile && partnerResponse.data.profile.referralUsers) {
      partnersData.value = partnerResponse.data.profile.referralUsers.map((user: any, index: number) => ({
        id: parseInt(user.ID) || index + 1,
        name: user.LOGIN || 'Без имени',
        email: user.EMAIL || '',
        date: formatDate(user.DATE_REGISTER),
        earnings: user.PAYOUT || `0 ${profileData.value.currencySymbol}`,
        releases: formatReleases(user.UF_RELEASES)
      }));
    } else {
      partnersData.value = [];
    }
  } catch (error) {
    console.error('Ошибка при загрузке партнеров:', error);
    partnersData.value = [];
    throw error;
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const formatReportFileSizeBytes = (bytes: number | null | undefined): string => {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  if (i === 0) return `${Math.round(v)} ${units[i]}`;
  const decimals = v >= 10 || i === 1 ? 0 : 1;
  return `${v.toLocaleString('ru-RU', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })} ${units[i]}`;
};

const parseLooseMoneyValue = (rawValue: unknown): number => {
  if (typeof rawValue === 'number') {
    return Number.isFinite(rawValue) ? rawValue : 0;
  }
  if (typeof rawValue !== 'string') return 0;
  const normalized = rawValue
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatLifetimeEarnings = (value: number): string => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const isInteger = Math.abs(safeValue % 1) < 0.000001;
  return safeValue.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: isInteger ? 0 : 2
  });
};

const mapTransactionItem = (item: any, index: number): Transaction => ({
  id: item.ID || index + 1,
  type: item.TYPE || 'Транзакция',
  date: item.DATE || '',
  period: item.PERIOD || '-',
  status: normalizeTransactionStatus(item.STATUS),
  amount: item.SUM
    ? `${Number(item.SUM).toLocaleString()} ${item.CURRENCY || transactionCurrencySuffix()}`
    : `0 ${transactionCurrencySuffix()}`,
  currency: item.CURRENCY
});

const isCompletedFinanceStatus = (status: unknown): boolean => {
  const normalized = String(status ?? '').trim().toLowerCase();
  return normalized === 'выполнен' || normalized === 'completed';
};

const sumCompletedPayouts = (items: Array<Record<string, unknown>>): number =>
  items.reduce((acc, item) => {
    if (!isCompletedFinanceStatus(item.STATUS)) return acc;
    return acc + parseLooseMoneyValue(item.SUM);
  }, 0);

const refreshLifetimeEarningsFromFinances = async (
  finances: Record<string, unknown> | undefined,
  currentPageItems: Array<Record<string, unknown>>
) => {
  const totalItems = Number(finances?.total ?? currentPageItems.length);
  const perPageSource = finances?.perPage ?? currentPageItems.length ?? 1;
  const perPage = Math.max(1, Number(perPageSource));
  const currentPage = Math.max(1, Number(finances?.currentPage ?? 1));
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

  let total = sumCompletedPayouts(currentPageItems);
  if (totalPages <= 1) {
    lifetimeEarningsTotal.value = total;
    return;
  }

  for (let page = 1; page <= totalPages; page++) {
    if (page === currentPage) continue;
    try {
      const response = await sendRequest('get', `/ajax_vue/ajax/getData.php?PAGEN_2=${page}`, {});
      const pageFinances = response.data?.finances as Record<string, unknown> | undefined;
      const pageItems = pageFinances?.items;
      if (!Array.isArray(pageItems)) continue;
      total += sumCompletedPayouts(pageItems as Array<Record<string, unknown>>);
    } catch (error) {
      console.error(`Ошибка при загрузке транзакций (страница ${page}) для пересчёта суммы:`, error);
    }
  }

  lifetimeEarningsTotal.value = total;
};

const mapReportItem = (item: any): Report => ({
  id: item.id,
  filename: item.name || 'Отчёт',
  filesize:
    item.filesize ||
    item.fileSize ||
    item.FILE_SIZE ||
    formatReportFileSizeBytes(item.filesizeBytes) ||
    '',
  filesizeBytes: item.filesizeBytes ?? null,
  date: item.date || '',
  hasAct: false,
  xlsxUrl: item.xlsxUrl,
  pdfUrl: item.pdfUrl,
  images: item.images || []
});

const formatReleases = (releases: string | number) => {
  const count = Number(releases);
  if (count === 0) return '0 релизов';
  if (count === 1) return '1 релиз';
  if (count >= 2 && count <= 4) return `${count} релиза`;
  return `${count} релизов`;
};

const openPayoutAmountPopup = () => {
  if (profileData.value.balance < minPayoutAmount.value) {
    showLowBalancePopup.value = true;
    document.documentElement.classList.add('noscroll');
    return;
  }
  
  // Автоматически устанавливаем сумму равной максимальному балансу
  payoutAmount.value = profileData.value.balance;
  actError.value = '';
  showPayoutAmountPopup.value = true;
  document.documentElement.classList.add('noscroll');
};

const goToBankRequisitesSettings = () => {
  closeAllPopups();
  const settingsRoute = Tr.i18nRoute({ name: 'setting' });
  const normalized =
    typeof settingsRoute === 'string' ? { path: settingsRoute } : settingsRoute;

  router.push({
    ...normalized,
    hash: '#settings-bank-requisites'
  });
};

const requestPayoutByRegion = async () => {
  if (isRussianRegion.value) {
    await requestPayoutAct();
    return;
  }

  await requestPayoutDirect();
};

const requestPayoutDirect = async () => {
  if (!isPayoutAmountValid.value) {
    actError.value = `Сумма должна быть от ${minPayoutAmount.value} до ${profileData.value.balance} ${profileData.value.currencySymbol}`;
    return;
  }

  loading.value = true;
  isRequestingAct.value = true;
  actError.value = '';

  try {
    const valuta = profileData.value.currency;

    const response = await sendRequest('post', '/ajax_vue/ajax/profile/vyplata.php', {
      summ: payoutAmount.value,
      valuta,
      summLables: payoutAmount.value
    });

    console.log('Ответ при прямом запросе выплаты:', response.data);

    if (response.data && response.data.error === 0) {
      closeAllPopups();
      showPayoutSuccessPopup.value = true;
      document.documentElement.classList.add('noscroll');
      await fetchProfileData();
      scheduleFinancialStatusesRefresh();
    } else {
      actError.value = response.data?.message || 'Ошибка при обработке выплаты';
    }
  } catch (error: any) {
    console.error('Ошибка при прямом запросе выплаты:', error);
    actError.value = error.response?.data?.message || 'Не удалось обработать выплату';
  } finally {
    isRequestingAct.value = false;
    loading.value = false;
  }
};

const requestPayoutAct = async () => {
  if (!isPayoutAmountValid.value) {
    actError.value = `Сумма должна быть от ${minPayoutAmount.value} до ${profileData.value.balance} ${profileData.value.currencySymbol}`;
    return;
  }

  loading.value = true;
  isRequestingAct.value = true;
  actError.value = '';

  try {
    const valuta = profileData.value.currency;
    
    const response = await sendRequest('post', '/ajax_vue/ajax/profile/aktVyplata.php', {
      summ: payoutAmount.value,
      valuta: valuta,
      summLabels: payoutAmount.value
    });

    console.log('Ответ при получении акта:', response.data);

    if (response.data && response.data.error === 0) {
      actData.value = {
        docx_url: response.data.data.docx_url,
        pdf_url: response.data.data.pdf_url,
        images: response.data.data.images || [],
        element_id: response.data.data.element_id,
        message: response.data.message
      };
      
      showPayoutAmountPopup.value = false;
      showImagesPopup.value = true;
    } else {
      actError.value = response.data?.message || 'Ошибка при получении акта';
    }
  } catch (error: any) {
    console.error('Ошибка при запросе акта:', error);
    actError.value = error.response?.data?.message || 'Не удалось получить акт для подписи';
  } finally {
    isRequestingAct.value = false;
    loading.value = false;
  }
};

const goToSignature = () => {
  showImagesPopup.value = false;
  showSignaturePopup.value = true;
};

const submitToVyplataApi = async () => {
  if (!actData.value || !payoutAmount.value) return;
  
  isSubmittingVyplata.value = true;
  vyplataError.value = '';
  
  try {
    const valuta = profileData.value.currency;
    
    const response = await sendRequest('post', '/ajax_vue/ajax/profile/vyplata.php', {
      summ: payoutAmount.value,
      valuta: valuta,
      summLables: payoutAmount.value,
      element_id: actData.value.element_id
    });
    
    console.log('Ответ от API выплаты:', response.data);
    
    if (response.data && response.data.error === 0) {
      closeAllPopups();
      showPayoutSuccessPopup.value = true;
      document.documentElement.classList.add('noscroll');
      await fetchProfileData();
      scheduleFinancialStatusesRefresh();
    } else {
      vyplataError.value = response.data?.message || 'Ошибка при обработке выплаты';
      alert(vyplataError.value);
    }
  } catch (error: unknown) {
    console.error('Ошибка при отправке на API выплаты:', error);
    
    let errorMessage = 'Не удалось обработать выплату';
    if (error && typeof error === 'object') {
      const err = error as { response?: { data?: { message?: string } } };
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
    }
    
    vyplataError.value = errorMessage;
    alert(vyplataError.value);
  } finally {
    isSubmittingVyplata.value = false;
  }
};

const submitSignature = async (signatureDataUrl: string) => {
  if (!actData.value) return;

  try {
    const elementId = String(actData.value.element_id || '').trim();
    if (!elementId) {
      throw new Error('Не найден id договора для отправки подписи');
    }
    if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(signatureDataUrl)) {
      throw new Error('Подпись имеет неверный формат. Подпишите договор ещё раз');
    }

    const formData = new FormData();
    // Для совместимости с разными версиями обработчика передаем все ожидаемые имена.
    formData.append('name', elementId);
    formData.append('id', elementId);
    formData.append('element_id', elementId);
    // Бэкенд ожидает URL/строку подписи, а не бинарный файл.
    formData.append('signature', signatureDataUrl);

    const submitResponse = await fetch('/ajax_vue/ajax/newAkt_vyp.php', {
      method: 'POST',
      body: formData,
    });

    if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        console.error('Ошибка HTTP:', submitResponse.status, errorText);
        throw new Error(`HTTP error! status: ${submitResponse.status}`);
    }

    const responseText = await submitResponse.text();
    let result: { error?: number | string | boolean; message?: string } | null = null;
    try {
      result = JSON.parse(responseText) as { error?: number | string | boolean; message?: string };
    } catch {
      const trimmedText = responseText.trim();
      if (trimmedText) {
        throw new Error(trimmedText);
      }
      throw new Error('Сервер вернул пустой ответ при отправке подписи');
    }

    console.log('Ответ при отправке подписи:', result);

    if (result && Number(result.error) !== 0) {
      throw new Error(result.message || 'Ошибка при отправке подписи');
    }

    await submitToVyplataApi();
    
  } catch (error: unknown) {
    console.error('Ошибка при отправке подписи:', error);
    
    let errorMessage = 'Неизвестная ошибка';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String((error as { message: unknown }).message);
    }
    
    alert(`Не удалось отправить подпись: ${errorMessage}`);
  }
};

const getCopySuccessMessage = (type: string): string => {
  if (type === 'Ссылка') {
    return 'Ссылка скопирована!';
  }

  return `${type} скопирован!`;
};

// Функция для копирования текста в буфер обмена
const copyToClipboard = async (text: string, type: string) => {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage({
      message: getCopySuccessMessage(type),
      type: 'success',
      duration: 2000,
      showClose: true
    });
  } catch (err) {
    console.error('Ошибка при копировании:', err);
    // Fallback для старых браузеров
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    ElMessage({
      message: getCopySuccessMessage(type),
      type: 'success',
      duration: 2000,
      showClose: true
    });
  }
};

const openBonusPayoutPopup = () => {
  bonusPayoutAmount.value = null;
  payoutError.value = '';
  
  if (maxBonusAmount.value <= 0) {
    alert('У вас нет бонусов для выплаты');
    return;
  }
  
  showBonusPayoutPopup.value = true;
  document.documentElement.classList.add('noscroll');
};

const submitBonusPayout = async () => {
  if (!isBonusAmountValid.value) {
    payoutError.value = `Сумма должна быть от 1 до ${maxBonusAmount.value}`;
    return;
  }

  loading.value = true;
  isSubmittingBonusPayout.value = true;
  payoutError.value = '';

  try {
    const valuta = profileData.value.currency;
    
    const response = await sendRequest('post', '/ajax_vue/ajax/profile/bonusVyplata.php', {
      summ: bonusPayoutAmount.value,
      valuta: valuta
    });

    console.log('Ответ на выплату бонусов:', response.data);

    if (response.data) {
      if (response.data.error === 0 || response.data.error === false || response.data.error === '0') {
        alert('Запрос на выплату бонусов успешно отправлен');
        closeBonusPayoutPopup();
        await fetchProfileData();
        return;
      }
      
      if (response.data.success === true || response.data.success === '1' || response.data.success === 1) {
        alert('Запрос на выплату бонусов успешно отправлен');
        closeBonusPayoutPopup();
        await fetchProfileData();
        return;
      }
      
      if (response.data.status === 'ok' || response.data.status === 'success') {
        alert('Запрос на выплату бонусов успешно отправлен');
        closeBonusPayoutPopup();
        await fetchProfileData();
        return;
      }
      
      if (response.data.message && (
          response.data.message.toLowerCase().includes('успех') || 
          response.data.message.toLowerCase().includes('success') ||
          response.data.message.toLowerCase().includes('отправлен')
      )) {
        alert(response.data.message);
        closeBonusPayoutPopup();
        await fetchProfileData();
        return;
      }
      
      if (!response.data.error && !response.data.errorCode) {
        alert('Запрос на выплату бонусов успешно отправлен');
        closeBonusPayoutPopup();
        await fetchProfileData();
        return;
      }
    }
    
    const errorMessage = response.data?.message || 
                        response.data?.errorMessage || 
                        response.data?.error ||
                        'Произошла ошибка при запросе выплаты';
    
    payoutError.value = errorMessage;
    
  } catch (error: unknown) {
    console.error('Ошибка при запросе выплаты бонусов:', error);
    
    let errorMessage = 'Не удалось отправить запрос. Проверьте соединение и попробуйте позже.';
    
    if (error && typeof error === 'object') {
      const err = error as { response?: { data?: { message?: string } } };
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
    }
    
    payoutError.value = errorMessage;
  } finally {
    isSubmittingBonusPayout.value = false;
    loading.value = false;
  }
};

const closeBonusPayoutPopup = () => {
  showBonusPayoutPopup.value = false;
  bonusPayoutAmount.value = null;
  payoutError.value = '';
  isSubmittingBonusPayout.value = false;
  document.documentElement.classList.remove('noscroll');
};

const loadAllData = async () => {
  loading.value = true;
  loadedCount.value = 0;
  
  try {
    await Promise.all([
      fetchProfileData().finally(() => loadedCount.value++),
      fetchReleases().finally(() => loadedCount.value++),
      fetchReports().finally(() => loadedCount.value++),
      fetchTransactions().finally(() => loadedCount.value++),
      fetchArticles().finally(() => loadedCount.value++),
      fetchPartners().finally(() => loadedCount.value++)
    ]);
  } catch (error) {
    console.error('Ошибка при загрузке данных:', error);
  } finally {
    loading.value = false;
  }
};

let unregisterPersonalShellRefresh: (() => void) | null = null;

const refreshPersonalAfterShellEvent = async (
  prefetched?: Record<string, unknown>
) => {
  if (prefetched) {
    loading.value = true;
    loadedCount.value = 0;
    try {
      await fetchProfileData(prefetched).finally(() => loadedCount.value++);
      await Promise.all([
        fetchReleases().finally(() => loadedCount.value++),
        fetchReports().finally(() => loadedCount.value++),
        fetchTransactions().finally(() => loadedCount.value++),
        fetchArticles().finally(() => loadedCount.value++),
        fetchPartners().finally(() => loadedCount.value++),
      ]);
    } catch (error) {
      console.error("Ошибка обновления ЛК после смены аккаунта:", error);
    } finally {
      loading.value = false;
    }
  } else {
    await loadAllData();
  }
};

const getUpcDisplayText = (release: Release): string => {
  if (release.upcCode && release.upcCode !== 'Нет данных') {
    return release.upcCode;
  }
  return isReleaseDayReached(release) ? 'узнать' : 'уточнить в поддержке';
};

const handleUpcClick = (release: Release) => {
  const displayText = getUpcDisplayText(release);

  if (displayText === 'уточнить в поддержке') {
    openSupportPage();
  } else if (displayText === 'узнать') {
    window.open('https://musicfetch.io/upc-finder', '_blank', 'noopener,noreferrer');
  } else {
    copyToClipboard(release.upcCode!, 'UPC');
  }
};

const getReleaseLinkPlaceholderLabel = (
  _release: Release
): 'уточнить в поддержке' | 'создать ссылку' => {
  // Кнопка доступна всегда (в т.ч. до даты релиза): пресейв BandLink нужен именно
  // для предстоящих релизов, а смартлинк VauVision дозаполнится площадками после выхода.
  return 'создать ссылку';
};

/** Идёт ли сейчас создание смартлинка для релиза (защита от повторных кликов). */
const creatingSmartlinkIds = ref<Set<string | number>>(new Set());

/**
 * Вызывает создание смартлинка по UPC. UPC передаётся только если пользователь
 * ввёл его вручную (когда у релиза кода нет). Возвращает true при успехе.
 */
type SmartlinkMode = 'vauvision' | 'bandlink';

const requestSmartlink = async (
  release: Release,
  upc?: string,
  mode: SmartlinkMode = 'vauvision'
): Promise<boolean> => {
  const loading = ElMessage({ type: 'info', message: 'Создаём ссылку…', duration: 0 });
  try {
    const payload: Record<string, unknown> = { RELEASE_ID: release.id, link_type: mode };
    if (upc) payload.UPC = upc;

    const response = await sendRequest(
      'post',
      '/ajax_vue/ajax/profile/createSmartlink.php',
      payload
    );

    const url = String(response.data?.data?.url ?? '').trim();
    if (!url) {
      ElMessage.error(response.data?.message || 'BandLink не вернул ссылку');
      return false;
    }

    release.link = url;
    ElMessage.success(response.data?.data?.cached ? 'Ссылка уже создана' : 'Ссылка создана');
    return true;
  } finally {
    loading.close();
  }
};

/**
 * Запрашивает у пользователя UPC код и создаёт ссылку выбранного типа.
 * Открывается, когда у релиза нет UPC (бэк вернул need_upc).
 */
const promptUpcAndCreateSmartlink = async (
  release: Release,
  mode: SmartlinkMode = 'vauvision'
): Promise<void> => {
  let upcInput: string;
  try {
    const { value } = await ElMessageBox.prompt(
      'Введите UPC код вашего релиза',
      'Создание ссылки',
      {
        confirmButtonText: 'Создать ссылку',
        cancelButtonText: 'Отмена',
        inputPlaceholder: 'UPC (от 12 до 255 цифр)',
        inputValidator: (val: string) => {
          const digits = (val || '').replace(/\D+/g, '');
          return /^[0-9]{12,255}$/.test(digits)
            ? true
            : 'UPC должен содержать от 12 до 255 цифр';
        },
      }
    );
    upcInput = (value || '').replace(/\D+/g, '');
  } catch {
    return; // пользователь закрыл/отменил окно
  }

  try {
    await requestSmartlink(release, upcInput, mode);
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Не удалось создать ссылку');
  }
};

const handleCreateReleaseLinkPlaceholder = (release: Release): void => {
  if (creatingSmartlinkIds.value.has(release.id)) {
    return;
  }
  // Открываем попап с выпадающим списком выбора типа ссылки
  smartlinkTypeRelease.value = release;
  selectedSmartlinkType.value = 'vauvision';
  showSmartlinkTypePopup.value = true;
  document.documentElement.classList.add('noscroll');
};

/** Создаёт ссылку выбранного типа для релиза (с обработкой need_upc). */
const createSmartlinkForRelease = async (
  release: Release,
  mode: SmartlinkMode
): Promise<void> => {
  creatingSmartlinkIds.value.add(release.id);
  try {
    await requestSmartlink(release, undefined, mode);
  } catch (error: any) {
    const status = error?.response?.status;
    const needUpc = error?.response?.data?.data?.need_upc;
    if (status === 422 && needUpc) {
      await promptUpcAndCreateSmartlink(release, mode);
    } else {
      ElMessage.error(error?.response?.data?.message || 'Не удалось создать ссылку');
    }
  } finally {
    creatingSmartlinkIds.value.delete(release.id);
  }
};

/** Подтверждение выбора типа в попапе — закрывает окно и запускает создание. */
const confirmSmartlinkType = async (): Promise<void> => {
  const release = smartlinkTypeRelease.value;
  const mode = selectedSmartlinkType.value;
  if (!release) return;
  closeAllPopups();
  await createSmartlinkForRelease(release, mode);
};

const handleReleaseServiceComingSoon = () => {
  ElMessage.info('Сервис в разработке и скоро будет добавлен');
};

const handleReleaseLinkPlaceholderClick = (release: Release) => {
  const label = getReleaseLinkPlaceholderLabel(release);
  if (label === 'уточнить в поддержке') {
    openSupportPage();
  } else {
    handleCreateReleaseLinkPlaceholder(release);
  }
};

const openSupportPage = () => {
  router.push(Tr.i18nRoute({ name: 'support' }));
};

onMounted(() => {
  unregisterPersonalShellRefresh = registerLabelArtistsExternalRefresh(
    refreshPersonalAfterShellEvent
  );
  loadAllData();
});

onUnmounted(() => {
  clearFinancialStatusRefreshTimers();
  stopReportDownloadProgress();
  stopReportDownloadDelayMessageTimer();
  unregisterPersonalShellRefresh?.();
  unregisterPersonalShellRefresh = null;
});
</script>

<style lang="scss" scoped>
.loading__container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.loading__svg {
  width: 100px;
  height: 100px;
}

/* Стили для кнопки с загрузкой */
.button__loading {
  opacity: 0.7;
  cursor: wait;
  pointer-events: none;
  position: relative;
}

.button__loader {
  display: inline-block;
  position: relative;
  padding-left: 24px;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: button-spin 0.8s linear infinite;
  }
}

@keyframes button-spin {
  0% {
    transform: translateY(-50%) rotate(0deg);
  }
  100% {
    transform: translateY(-50%) rotate(360deg);
  }
}

.personal__block {
  @media (max-width: 1919px) {
    width: calc(100% - 230px);
  }

  @media (max-width: 1439px) {
    width: 100%;
  }
}

.personal__container {
  @media (max-width: 767px) {
    padding: 0;
  }
}

.personal__flex {
  display: flex;
  gap: 20px;

  @media (max-width: 1919px) {
    gap: 20px;
  }
}

.personal__content {
  display: flex;
  width: calc(100% - 440px);
  flex-direction: column;
  gap: 20px;
  overflow: hidden;

  @media (max-width: 1919px) {
    width: calc(100% - 340px);
  }

  @media (max-width: 1439px) {
    width: 100%;
  }
}

.personal__balance {
  background-color: var(--bg);
  border: 1px solid var(--border);

  &_top_row {
    display: grid;
    grid-template-columns: 48% 1fr;

    @media (max-width: 1024px) {
      grid-template-columns: 1fr;
    }
  }

  &_info {
    display: flex;
    justify-content: center;
    min-height: 138px;
    padding: 40px;
    flex-direction: column;
    gap: 10px;

    @media (max-width: 1439px) {
      min-height: 124px;
      padding: 30px;
    }

    @media (max-width: 767px) {
      min-height: 110px;
      padding: 24px 15px;
    }
  }

  &_head_name {
    text-transform: none;
  }

  &_desc {
    color: var(--text-gray);
  }

  &_list {
    display: flex;
    padding: 0 40px;
    flex-wrap: wrap;
    position: relative;

    @media (max-width: 1439px) {
      padding: 30px;
      gap: 30px;
    }

    @media (max-width: 767px) {
      padding: 30px 15px;
      gap: 20px;
    }
  }

  &_item {
    display: flex;
    flex: 0 0 33.333%;
    max-width: 33.333%;
    padding: 40px 20px;
    flex-direction: column;
    justify-content: space-between;
    gap: 20px;
    position: relative;

    &:not(:last-child)::after {
      content: '';
      position: absolute;
      right: 0;
      top: 0;
      height: 100%;
      width: 1px;
      background-color: var(--border);
    }

    @media (max-width: 1919px) {
      max-width: 33.333%;
      padding: 40px 20px;
    }

    @media (max-width: 1439px) {
      max-width: 100%;
      padding: 0;

      &:first-child {
        width: 100%;
        max-width: 100%;
        padding: 0;
      }

      &:first-child::after {
        display: none;
      }

      &:not(:last-child)::after {
        display: none;
      }
    }

    @media (max-width: 767px) {
      padding: 0;
    }

    .personal__balance_button {
      @media (max-width: 767px) {
        padding-left: 50px;
      }
    }
  }

  &_top {
    display: flex;
    flex: 0 0 auto;
    gap: 10px;

    &_info {
      display: flex;
      padding: 8px 0;
      flex-direction: column;
      gap: 10px;
    }
  }

  &_heading {
    display: flex;
    flex: 0 0 auto;
    align-items: flex-end;
    gap: 6px;
  }

  &_button {
    width: 100%;

    span {
      width: 100%;
      padding: 12px 20px;

      @media (max-width: 1023px) {
        width: auto;
      }
    }

    svg {
      width: 20px;
      height: 20px;
      object-fit: contain;
      transform: translateY(-1px);
    }
  }

  &_svg {
    display: flex;
    width: 40px;
    height: 40px;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    background-color: var(--border);
    border-radius: 50%;
    overflow: hidden;

    svg {
      width: 20px;
      height: 20px;
      object-fit: contain;
    }
  }
}

.personal__socials {
  display: flex;
  min-height: 138px;
  padding: 40px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 16px;
  // color: #dddddd;
  // border-left: 1px solid var(--border);

  @media (max-width: 1439px) {
    min-height: 124px;
    padding: 30px;
  }

  @media (max-width: 767px) {
    min-height: auto;
    padding: 24px 15px;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    border-left: none;
    border-top: 1px solid var(--border);
  }
}

.personal__socials_title {
  margin: 0;
  font-size: 20px;
  line-height: 1.15;
  color: var(--text-gray);
  white-space: nowrap;
}

.personal__socials_list {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 767px) {
    flex-wrap: wrap;
  }
}

.personal__socials_item {
  display: flex;
}

.personal__socials_link {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  color: var(--text-gray);
}

.personal__socials_icon {
  display: block;
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.personal__artist_banner {
  margin: 0;
  color: var(--color);
  font-weight: 500;
}

.personal__lifetime_earnings {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  line-height: 1.35;
  font-weight: 400;
  color: #131313;
}

.personal__lifetime_earnings_label {
  font-weight: 400;
  color: #131313;
}

.personal__lifetime_earnings_amount {
  font-weight: 400;
  color: #ab1115;
}

.personal__lifetime_earnings_fire {
  line-height: 1;
}

.personal__divider {
  width: 100%;
  height: 1px;
  background-color: var(--border);
}

.personal__right {
  display: flex;
  flex-direction: column;
  gap: 20px;

  @media (max-width: 1439px) {
    display: none;
  }
}

.personal__release {
  display: flex;
  min-height: 315px;
  padding: 40px;
  flex-direction: column;
  justify-content: space-between;
  gap: 30px;
  position: relative;
  background-color: var(--bg);
  border: 1px solid var(--border);
  overflow: hidden;

  @media (max-width: 1439px) {
    min-height: auto;
  }

  @media (max-width: 767px) {
    padding: 30px 15px;
  }

  &_flex {
    display: flex;
    flex-direction: column;
    gap: 10px;
    position: relative;
    z-index: 2;

    @media (max-width: 767px) {
      padding-left: 50px;
    }
  }

  &_button {
    position: relative;
    z-index: 2;

    @media (max-width: 767px) {
      padding-left: 50px;
    }
  }

  &_desc {
    max-width: 510px;
    color: var(--text-gray);

    @media (max-width: 1919px) {
      max-width: 410px;
    }

    @media (max-width: 1439px) {
      max-width: 480px;
    }

    @media (max-width: 767px) {
      max-width: 100%;
    }
  }

  &_image {
    width: 315px;
    max-width: calc(100% - 510px - 20px);
    height: 100%;
    flex: 0 0 auto;
    position: absolute;
    top: 0;
    right: 0;
    z-index: 1;

    @media (max-width: 1919px) {
      width: 270px;
      max-width: calc(100% - 410px - 20px);
    }

    @media (max-width: 1439px) {
      width: 230px;
      max-width: calc(100% - 480px - 20px);
    }

    @media (max-width: 767px) {
      width: 194px;
      max-width: 100%;
      top: auto;
      bottom: -70px;
    }

    @media (max-width: 580px) {
      width: 150px;
      bottom: -100px;
    }

    img {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      object-fit: contain;

      &:nth-child(1) {
        z-index: 1;
      }

      &:nth-child(2) {
        z-index: 2;
      }
    }
  }
}

.personal__releases {
  display: flex;
  padding: 40px;
  
  background-color: var(--bg);
  border: 1px solid var(--border);

  @media (max-width: 1439px) {
    padding: 30px;
  }

  @media (max-width: 767px) {
    padding: 30px 15px;
  }

  &_block {
    width: 100%;
    align-items: flex-start;
    flex-direction: column;
    gap: 20px;
  }

  &_title {
    padding: 0 0 30px;

    @media (max-width: 1439px) {
      padding: 0 0 20px;
    }
  }

  &_list {
    display: flex;
    flex-direction: column;
  }

  &_item {
    display: flex;
    width: 100%;
    padding: 20px 0;
    flex-wrap: nowrap;
    gap: 40px;
    border-bottom: 1px solid var(--border);

    &:first-child {
      border-top: 1px solid var(--border);
    }

    @media (max-width: 767px) {
      flex-direction: column;
      gap: 20px;
    }
  }

  &_image {
    display: flex;
    width: 160px;
    height: 160px;
    margin: auto 0;
    flex: 0 0 auto;
    position: relative;
    background-color: var(--border);

    @media (max-width: 1919px) {
      width: 140px;
      height: 140px;
    }

    @media (max-width: 767px) {
      width: 100px;
      height: 100px;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &_image_placeholder {
    width: 100%;
    height: 100%;
    background-color: var(--border);
    border-radius: 4px;
  }

  &_info {
    display: flex;
    flex: 1;
    width: 100%;
    min-width: 0;
    flex-direction: column;

    @media (max-width: 767px) {
      flex-direction: column;
      gap: 20px;

      .personal__releases_top,
      .personal__releases_date {
        display: none;
      }
    }
  }

  &_information {
    display: none;
    // .personal__releases_flex {
      
    // }

    @media (max-width: 767px) {
      display: flex;
      width: 100%;
      gap: 15px;

      .personal__releases_flex {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 15px;
      }
    }
  }

  &_top {
    display: flex;
    padding: 0 0 16px;
    flex-direction: column;
    gap: 10px;
  }

  &_head {
    text-transform: uppercase;

    span {
      font-weight: 400;
    }
  }

  &_codes {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    gap: 10px;
    padding: 0 0 10px;

    &:has(.personal__releases_code:only-child) {
      justify-content: flex-start;

      .personal__releases_code {
        flex: 0 0 auto;
        min-width: 200px;
      }
    }
  }

  &_code {
    display: inline-flex;
    width: calc(50% - 5px);
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    min-width: 140px;
    color: var(--text);
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @media (max-width: 1919px) {
      width: calc(50% - 7px);
    }

    @media (max-width: 767px) {
      width: calc(50% - 5px);
    }

    @media (max-width: 480px) {
      width: 100%;
      max-width: 100%;
    }

    span {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      object-fit: contain;
    }

    &:hover {
      color: var(--white);
      background-color: var(--color);
      border-color: var(--color);
    }
  }

  &_code_action {
    cursor: pointer;
  }

  &_date {
    color: var(--text-gray);
  }

  &_agreements {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 20px;
  }

  &_agreement {
    display: flex;
    flex-wrap: nowrap;
    gap: 8px;
    text-transform: uppercase;

    svg {
      width: 16px;
      height: 16px;
      object-fit: contain;
    }
  }

  &_bottom {
    display: flex;
    width: 100%;
    margin: auto 0 0;
    justify-content: space-between;
    gap: 20px;
  }

  &_tracks {
    margin: 15px 0;
    padding: 15px;
    background-color: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
    border: 1px solid var(--border);
  }

  &_services{
    width: 220px;
    min-width: 220px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    margin-top: 52px;

    @media (max-width: 1023px) {
      width: 100%;
      min-width: 0;
      max-width: 100%;
      margin-top: 0;
    }

    @media (max-width: 767px) {
      max-width: 100%;
      margin-top: 0;
    }
  }

  &_service_button {
    display: flex;
    cursor: pointer;
    width: calc(100% - 0px);
    min-height: 40px;
    justify-content: center;
    padding: 10px 30px;
    font-weight: 400;
    color: var(--white);
    background-color: var(--color);
    font-size: 14px;
    line-height: 20px;
    transition: all 0.3s ease;
    &:hover {
      color: var(--white);
      background-color: var(--black);
    }
  }

}

/* Стили для блока треков */
.personal__tracks {
  &_title {
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--text);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  &_list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &_item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    background-color: var(--bg);
    border-radius: 6px;
    transition: background-color 0.2s;

    @media (max-width: 767px) {
      flex-wrap: wrap;
    }

    &:hover {
      background-color: var(--border);
    }
  }

  &_number {
    width: 24px;
    font-weight: 500;
    color: var(--text);
    flex-shrink: 0;
    text-align: center;

    @media (max-width: 767px) {
      width: 24px;
      text-align: center;
    }
  }

  &_info {
    flex: 1;
    min-width: 0;

    @media (max-width: 480px) {
      width: 100%;
    }
  }

  &_name {
    color: var(--text);
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @media (max-width: 480px) {
      white-space: normal;
      word-break: break-word;
    }
  }

  &_duration {
    color: var(--text-gray);
    display: inline-block;
  }

  &_isrc {
    margin-top: 2px;
  }

  &_isrc_link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;

    :deep(.personal__tracks_link_svg) {
      flex-shrink: 0;
      width: 14px;
      height: 14px;
      max-width: 14px;
      max-height: 14px;
      display: block;
    }
  }

  &_isrc_action {
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-block;
    padding: 2px 4px;
    border-radius: 4px;

    &:hover {
      background-color: var(--color);
      color: var(--white);
    }
  }
}

.personal__partner {
  display: flex;
  min-height: 315px;
  padding: 40px;
  flex-direction: column;
  justify-content: space-between;
  gap: 20px;
  position: relative;
  background-color: var(--bg);
  border: 1px solid var(--border);

  @media (max-width: 1919px) {
    gap: 84px;
  }

  @media (max-width: 1439px) {
    min-height: auto;
  }

  &_image {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    right: 0;
    z-index: 1;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &_info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    z-index: 2;
  }

  &_button {
    position: relative;
    z-index: 2;
  }
}

.personal__articles {
  display: flex;
  padding: 30px 40px;
  flex-direction: column;
  gap: 15px;
  background-color: var(--bg);
  border: 1px solid var(--border);

  &_desc {
    max-width: 280px;
    color: var(--text-gray);
  }

  &_link {
    display: flex;
    padding: 12px 0;
    gap: 15px;
  }

  &_image {
    display: flex;
    width: 60px;
    height: 60px;
    flex: 0 0 auto;
    position: relative;
    background-color: var(--border);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &_info {
    display: flex;
    max-width: 250px;
    flex-direction: column;
    justify-content: space-between;
    gap: 6px;
  }

  &_date {
    color: var(--text-gray);
  }

  &_top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  &_all {
    text-transform: uppercase;
    color: var(--color);

    &:hover {
      color: var(--text);
    }
  }
}

.articles__image_placeholder {
  width: 100%;
  height: 100%;
  background-color: var(--border);
  border-radius: 4px;
}

.personal__partners {
  display: flex;
  padding: 30px 40px;
  flex-direction: column;
  gap: 15px;
  background-color: var(--bg);
  border: 1px solid var(--border);

  &_top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  &_all {
    text-transform: uppercase;
    color: var(--color);

    &:hover {
      color: var(--text);
    }
  }

  &_link {
    display: flex;
    padding: 8px 0;
    flex-direction: column;
    gap: 6px;
  }

  &_desc {
    color: var(--text-gray);
  }
}

.personal__reports {
  display: flex;
  padding: 40px;
  flex-direction: column;
  gap: 20px;
  background-color: var(--bg);
  border: 1px solid var(--border);

  @media (max-width: 767px) {
    padding: 30px 15px;
  }

  &_top {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &_head {
    text-transform: uppercase;
  }

  &_desc {
    color: var(--text-gray);
  }

  &_list {
    display: flex;
    flex-direction: column;
    gap: 1px;
    background-color: var(--border);
  }

  &_item {
    display: flex;
    width: 100%;
    padding: 20px 0;
    align-items: center;
    background-color: var(--bg);
    gap: 20px;

    @media (max-width: 1023px) {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-gap: 15px;
    }
  }

  &_header {
    .text_small{
        color: #85858E;
    }

    @media (max-width: 1023px) {
      display: none;
    }
  }

  &_cell {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  &_image {
    display: flex;
    width: 40px;
    height: 40px;
    align-items: center;
    justify-content: center;
    background-color: #FBF4E2;
    border-radius: 4px;
    overflow: hidden;

    svg {
      display: flex;
      width: 20px;
      height: 20px;
      object-fit: contain;
      color: #E2B63F;
    }
  }

  &_info {
    flex: 3;
    min-width: 300px;

    @media (max-width: 1023px) {
      // flex: 0 0 auto;
      grid-column: 1 / 3;
    }
  }

  &_date {
    @media (max-width: 1023px) {
      grid-column: 1 / 2;
    }
  }

  &_actions {
    min-width: 120px;
    flex: 2;
    justify-content: flex-end;
    @media (max-width: 1023px) {
      grid-column: 2 / 3;
    }
  }

  &_file {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  &_filename {
    font-weight: 500;
  }

  &_filesize {
    color: var(--text-gray);
  }

  &_datevalue {
    color: var(--text-gray);
  }

  &_buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
  }

  &_button {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text);

    &:hover {
      color: var(--color);
    }

    svg {
      width: 16px;
      height: 16px;
      object-fit: contain;
      transform: translateY(-2px);
    }
  }

  &_empty {
    text-align: center;
    padding: 40px 20px;
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-top: 10px;
  }

  &_empty_text {
    color: var(--text-gray);
    margin: 0;
  }
}

.personal__transactions {
  display: flex;
  padding: 40px;
  flex-direction: column;
  gap: 20px;
  background-color: var(--bg);
  border: 1px solid var(--border);

  @media (max-width: 767px) {
    padding: 30px 15px;
  }

  &_head {
    text-transform: uppercase;
  }

  &_list {
    display: flex;
    flex-direction: column;
    gap: 1px;
    background-color: var(--border);
  }

  &_item {
    display: flex;
    width: 100%;
    padding: 20px 0;
    align-items: center;
    background-color: var(--bg);
    gap: 20px;

    @media (max-width: 1023px) {
      // flex-wrap: wrap;
      display: grid;
      grid-template-columns: 73px 1fr 1fr 115px;
      grid-gap: 15px 30px;
    }
  }

  &_header {
    .text_small{
        color: #85858E;
    }
    @media (max-width: 1023px) {
      display: none;
    }
  }

  &_cell {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  &_type {
    flex: 2;
    min-width: 120px;

    @media (max-width: 1023px) {
      width: calc(100% - 115px - 10px);
      // min-width: auto;
      // flex: 0 0 auto;
      // order: 1;
      grid-column: 1 / 4;
      grid-row: 1 / 2;
    }
  }

  &_date {
    flex: 1;
    min-width: 90px;

    @media (max-width: 1023px) {
      min-width: auto;
      // margin-right: 20px;
      // flex: 0;
      // order: 3;
      grid-column: 1 / 2;
      grid-row: 2 / 3;
    }
  }

  &_period {
    flex: 1;
    min-width: 100px;

    @media (max-width: 1023px) {
      min-width: auto;
      // order: 4;
      grid-column: 2 / 4;
      grid-row: 2 / 3;
    }
  }

  &_status {
    flex: 1;
    min-width: 115px;

    @media (max-width: 1023px) {
      width: 115px;
      min-width: auto;
      // flex: 0 0 auto;
      justify-content: flex-end;
      // order: 2;
      grid-column: 4 / 5;
      grid-row: 1 / 2;
    }
  }

  &_amount {
    flex: 1;
    min-width: 90px;
    justify-content: flex-end;
    font-weight: 500;

    @media (max-width: 1023px) {
      min-width: auto;
      // order: 5;
      grid-column: 4 / 5;
      grid-row: 2 / 3;
    }
  }

  &_image {
    display: flex;
    width: 40px;
    height: 40px;
    align-items: center;
    justify-content: center;
    background-color: #F2F1EF;
    border-radius: 4px;
    overflow: hidden;

    svg {
      width: 20px;
      height: 20px;
      object-fit: contain;
      color: var(--text);
    }
  }

  &_typevalue {
    color: var(--text);
  }

  &_datevalue,
  &_periodvalue {
    color: var(--text-gray);
  }

  &_statusvalue {
    display: flex;
    padding: 7px 15px;
    border-radius: 4px;
    overflow: hidden;
  }

  &_amountvalue {
    color: var(--text);
  }

  &_empty {
    text-align: center;
    padding: 40px 20px;
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-top: 10px;
  }

  &_empty_text {
    color: var(--text-gray);
    margin: 0;
  }
}

.status {
  &_completed {
    color: #51AA23;
    background-color: #EDFBE2;
  }

  &_processing {
    color: #85858E;
    background-color: #F2F1EF;
  }

  &_cancelled {
    color: #AB1115;
    background-color: #FBEBE2;
  }
}

/* Стили для disabled кнопки */
.button__disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* Стили для попапов */
.popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  &__content {
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    overflow: hidden;

    &_images {
      max-width: 800px;
    }

    &_lyrics {
      max-width: 600px;
      max-height: 80vh;
    }

    &_small {
      max-width: 600px;
    }
  }

  &__header {
    display: flex;
    padding: 20px;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    position: relative;

    @media (max-width: 1023px) {
      gap: 10px;
    }
  }

  &__back {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color);
    padding: 0;
    display: flex;
    align-items: center;
    gap: 5px;
    position: relative;
    z-index: 1;

    &:hover {
      color: var(--text);
    }
  }

  &__title {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    margin: 0;
    white-space: nowrap;
  }

  &__close {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-gray);
    position: relative;
    z-index: 1;
    font-size: 24px;
    line-height: 1;
  }

  &__body {
    padding: 20px;
    max-height: 60vh;
    overflow-y: auto;
  }

  &__loading {
    text-align: center;
    padding: 30px;
    color: var(--text-gray);
  }

  &__empty {
    text-align: center;
    padding: 40px 20px;

    p {
      margin: 0;
      color: var(--text-gray);
    }
  }

  &__empty_hint {
    margin-top: 8px;
    color: var(--text-gray-light);
  }

  &__empty_list {
    margin: 12px 0;
    padding-left: 30px;
    li {
      margin-bottom: 6px;
      font-size: 14px;
      text-align: left;
      &:last-child {
        margin-bottom: 0;
      }
      &::marker {
        font-size: 14px;
      }
    }
    
  }

  &__info-message {
    padding: 12px 15px;
    background-color: var(--bg-secondary, #f5f5f5);
    border-radius: 4px;
    border: 1px solid var(--border);
    color: var(--text);
    text-align: center;
    font-weight: 500;
  }

  &__commission-block {
    margin-top: 16px;
    padding: 16px;
    border: 1px solid #f0b429;
    border-radius: 8px;
    background: #fff8e6;
  }

  &__commission-text {
    margin: 0;
    color: #5c4300;
    font-weight: 600;
    line-height: 1.45;
    text-align: left;
  }

  &__commission-actions {
    margin-top: 16px;
    margin-bottom: 4px;
  }

  &__low-balance-body {
    text-align: center;
  }

  &__low-balance-value {
    margin: 0 0 16px;
    font-size: clamp(32px, 5vw, 44px);
    font-weight: 700;
    line-height: 1.15;
    color: var(--color);
  }

  &__low-balance-text {
    margin: 0;
    line-height: 1.5;
    color: var(--text);
    font-weight: 500;
  }

  &__years,
  &__quarters {
    display: flex;
    width: 100%;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;

    button,
    button span {
      width: 100%;
      min-width: 100%;
    }
  }

  &__year-selected {
    margin-bottom: 15px;
    font-weight: 500;
    color: var(--text-gray);
  }

  &__download-status {
    margin-top: 20px;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg-secondary, #f8f8f8);
  }

  &__download-spinner {
    width: 22px;
    height: 22px;
    margin: 0 auto 12px;
    border: 2px solid var(--border);
    border-top-color: var(--color);
    border-radius: 50%;
    animation: popup-spinner 0.8s linear infinite;
  }

  &__download-text {
    margin: 0 0 12px;
    line-height: 1.4;
    text-align: center;
    color: var(--text);
  }

  &__download-progressbar {
    width: 100%;
    height: 8px;
    border-radius: 999px;
    overflow: hidden;
    background: var(--border);
  }

  &__download-progressfill {
    height: 100%;
    background: linear-gradient(90deg, #ab1115 0%, #ff5f62 100%);
    transition: width 0.25s ease;
  }

  &__download-progressvalue {
    margin: 8px 0 0;
    text-align: right;
    font-size: 12px;
    color: var(--text-gray);
  }

  &__download-button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 20px;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    svg {
      width: 20px;
      height: 20px;
    }
  }

  &__info {
    margin-bottom: 20px;
    padding: 15px;
    background-color: var(--bg-secondary, #f5f5f5);
    border-radius: 4px;
    border: 1px solid var(--border);
  }

  &__balance-info {
    color: var(--text);
    margin-bottom: 5px;

    strong {
      color: var(--color);
    }
  }

  &__min-amount {
    color: var(--text-gray);
    margin-top: 5px;

    strong {
      color: var(--color);
    }
  }

  &__form-group {
    margin-bottom: 20px;
  }

  &__label {
    display: block;
    margin-bottom: 8px;
    color: var(--text-gray);
  }

  &__input {
    width: 100%;
    padding: 12px 15px;
    border: 1px solid var(--border);
    background-color: var(--bg);
    color: var(--text);
    border-radius: 4px;
    transition: border-color 0.3s;

    &:focus {
      outline: none;
      border-color: var(--color);
    }
  }

  &__input_error {
    border-color: #ff4d4f;
  }

  &__error-message {
    margin-top: 5px;
    color: #ff4d4f;
  }

  &__actions {
    display: flex;
    margin-top: 20px;
    align-items: center;
    justify-content: center;
    gap: 10px;

    @media (max-width: 580px) {
      flex-direction: column;
    }
  }

  &__images-info {
    margin-bottom: 20px;
    color: var(--text);
  }

  &__images-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
    max-height: 400px;
    overflow-y: auto;
    padding: 5px;

    @media (max-width: 767px) {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      max-height: 300px;
    }

    @media (max-width: 480px) {
      grid-template-columns: 1fr;
    }
  }

  &__image-item {
    width: 100%;
    position: relative;
    border: 1px solid var(--border);
    border-radius: 4px;
    display: block;
    cursor: pointer;
    text-decoration: none;
    background-color: var(--bg);
  }

  &__image {
    width: 100%;
    height: auto;
    display: block;
    object-fit: contain;
  }

  &__image-hint {
    display: block;
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.4;
    color: var(--text-gray);
    border-top: 1px solid var(--border);
  }

  &__year-select {
    width: 100%;
  }

  &__smartlink-body {
    text-align: center;
  }

  &__smartlink-select {
    width: 100%;
  }

  &__smartlink-hint {
    margin: 12px 0 0;
    color: var(--text-gray);
    font-size: 14px;
    text-align: center;
  }

  &__loading-select {
    margin-top: 10px;
    padding: 10px;
    text-align: center;
    color: var(--text-gray);
    font-size: 14px;
  }
}

@keyframes popup-spinner {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.quarter {
  &__name {
    font-weight: 500;
  }

  &__months {
    opacity: 0.8;
  }
}
</style>