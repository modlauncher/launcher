document.addEventListener('DOMContentLoaded', function() {
    // --- Selectors ---
    const sidebar = document.querySelector('.sidebar');
    const sidebarItems = document.querySelectorAll('.sidebar .sidebar-item'); // Target items within sidebar div
    const launcher = document.querySelector('.launcher');
    const particlesContainer = document.querySelector('.particles');
    const particlesToggle = document.getElementById('particles-status')?.parentElement; // Use optional chaining
    const particlesStatus = document.getElementById('particles-status');
    const contentArea = document.querySelector('.content'); // Main content area holding screens

    // Screens (initially only home is active)
    const homeScreen = document.getElementById('home-screen');
    const settingsScreen = document.getElementById('settings-screen');
    const updatesScreen = document.getElementById('updates-screen');
    const activeScreenClass = 'active'; // CSS class to show a screen

    // Social Buttons (Homepage)
    const discordButtonHome = document.getElementById('discord-btn');
    const youtubeButtonHome = document.getElementById('youtube-btn');
    const githubButtonHome = document.getElementById('github-btn');
    const downloadButtonHome = document.getElementById('download-btn');
    const downloadUI = document.getElementById('download-ui');
    const startDownloadButton = document.getElementById('start-download-btn');

    // Social Buttons (Footer) - REMOVED as they were not used in the provided HTML
    // Settings Buttons
    const resetDataBtn = document.querySelector('.reset-btn');
    const clearCacheBtn = document.querySelector('.clear-btn');

    // Footer Popup Elements
    const scrollDownArrow = document.querySelector('.scroll-down-arrow');
    const footerPopup = document.querySelector('.footer-popup');
    const scrollDownArrowIcon = scrollDownArrow?.querySelector('span');
    const footerUpdatesButton = document.getElementById('footer-updates-btn');
    const footerPopupButtonsContainer = document.querySelector('.footer-popup-buttons');
    const footerPopupButtons = document.querySelectorAll('.footer-popup-button');
    const creditsButton = Array.from(footerPopupButtons).find(button => button.textContent.trim() === 'Credits');

    // Confirmation Popup Elements
    const customConfirmationPopup = document.getElementById('custom-confirmation-popup');
    const customConfirmationMessage = customConfirmationPopup?.querySelector('.custom-confirmation-message');
    const customCancelButton = document.getElementById('custom-cancel-button');
    const customConfirmButton = document.getElementById('custom-confirm-button');
    const overlay = document.getElementById('overlay');
    const dontShowAgainCheckbox = document.getElementById('dont-show-again');

    // Achievement Popup Elements
    const achievementPopup = document.getElementById('achievement-popup');
    const achievementImage = document.getElementById('achievement-image');

    // Changelog Popup Elements
    const changelogPopup = document.getElementById('changelog-popup');
    const changelogCloseBtn = changelogPopup?.querySelector('.changelog-close-btn');
    const changelogExpandBtn = changelogPopup?.querySelector('.changelog-expand-btn');
    let isChangelogExpanded = false;
    const changelogTitleEl = changelogPopup?.querySelector('.changelog-title');
    const changelogVersionNameEl = document.getElementById('changelog-version-name');
    const changelogStatusEl = document.getElementById('changelog-version-status');
    const changelogDateEl = document.getElementById('changelog-date-released');
    const changelogTextEl = document.getElementById('changelog-text');
    const updatesListContainer = document.getElementById('updates-list-container');

    // Audio Elements
    const minecraftClickSound = document.getElementById('minecraft-click-sound');
    const sidebarClickSound = document.getElementById('sidebar-click-sound');
    const drawerCloseSound = document.getElementById('drawer-close-sound');
    const drawerOpenSound = document.getElementById('drawer-open-sound');
    const toastSound = document.getElementById('toast-sound');

    // --- State Variables ---
    let particlesEnabled = true;
    let footerPopupVisible = false;
    let particleInterval;
    const loadCountKey = 'tabLoadCount';
    let hasIncrementedLoadCount = false; // Track if load count incremented this session
    let pendingAction = null; // For confirmation popup
    let updatesData = null; // To store fetched updates.json data
    let currentActiveScreenId = 'home-screen'; // Track the currently visible screen
    let isTaskbarMode = false; // Track if taskbar mode is active
    let updatesIntervalId = null; // To store the interval ID for fetching updates
    let isFetchingUpdates = false; // To prevent overlapping fetch requests
    let colorMap = {}; // To store colors from color.json
    const dontShowAgainKey = 'dontShowRedirectWarning';
    let showRedirectWarning = !localStorage.getItem(dontShowAgainKey);

    // --- Constants and Mappings ---
    const statusMap = {
        0: { text: 'Latest', colorClass: 'status-0', nameColor: 'lightgreen' },
        1: { text: 'Beta/Preview', colorClass: 'status-1', nameColor: 'yellow' },
        2: { text: 'Outdated', colorClass: 'status-2', nameColor: '#FF6347' },
        3: { text: 'Development/Test Build', colorClass: 'status-3', nameColor: 'lightgray' }
    };

    // --- Initialization ---
    async function initialize() {
        console.log("Launcher Initializing...");
        updateParticleStatusText();
        if (particlesEnabled && particlesContainer) {
            startParticleEffect();
        }
        setupEventListeners();
        await fetchColorMap(); // Fetch colors before displaying updates
        // Show home screen initially explicitly (though HTML might default)
        showScreen('home-screen');
        console.log("Launcher Initialized.");
    }

    async function fetchColorMap() {
        try {
            const response = await fetch('color.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            colorMap = await response.json();
            console.log("Color map fetched:", colorMap);
        } catch (error) {
            console.error("Failed to fetch color.json:", error);
        }
    }

    // --- Utility Functions ---
    function playSound(soundElement) {
        if (soundElement) {
            soundElement.currentTime = 0; // Rewind to start
            soundElement.play().catch(err => console.error(`Sound playback failed: ${err}`));
        } else {
             console.warn("Attempted to play a non-existent sound element.");
        }
    }

    function colorCodeText(text) {
        if (!text) return "";
        let output = '';
        let i = 0;
        let currentColor = '#FFFFFF'; // Default to white (§f)

        while (i < text.length) {
            if (text[i] === '§' && i + 1 < text.length) {
                const colorCode = text.substring(i, i + 2);
                const hexColor = colorMap[colorCode];
                if (hexColor) {
                    currentColor = hexColor; // Update current color
                    i += 2;
                    continue; // Don't add the color code to the output
                } else if (colorCode === '§r') {
                    currentColor = '#FFFFFF'; // Reset color to white
                    i += 2;
                    continue;
                }
            }
            output += `<span class="colored" style="color: ${currentColor};">${text[i]}</span>`;
            i++;
        }
        return output;
    }

    // --- Screen Management ---
    function showScreen(screenId) {
        console.log(`Attempting to show screen: ${screenId}`);
        // Hide all screens first
        [homeScreen, settingsScreen, updatesScreen].forEach(screen => {
            if (screen) screen.classList.remove(activeScreenClass);
        });

        // Show the target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add(activeScreenClass);
            currentActiveScreenId = screenId;
            console.log(`Successfully shown screen: ${screenId}`);

            // Special actions when showing specific screens
            if (screenId === 'updates-screen') {
                startUpdatesInterval(); // Start fetching updates every 50ms
                if (!updatesData) {
                    fetchAndDisplayUpdates(); // Initial fetch
                }
            } else {
                stopUpdatesInterval(); // Stop fetching updates when leaving the screen
            }
        } else {
            console.warn(`Screen with ID "${screenId}" not found.`);
            // Fallback to home screen if target not found
            if (homeScreen) homeScreen.classList.add(activeScreenClass);
            currentActiveScreenId = 'home-screen';
        }

         // Update active sidebar item
         updateActiveSidebarItem(screenId);
    }

    function updateActiveSidebarItem(activeScreenId) {
        let correspondingNavItemId;
        switch (activeScreenId) {
            case 'home-screen': correspondingNavItemId = 'home-btn-nav'; break;
            case 'settings-screen': correspondingNavItemId = 'settings-btn-nav'; break;
            case 'updates-screen': correspondingNavItemId = 'updates-btn-nav'; break;
            // Add cases for other screens if they map to sidebar items
            default: correspondingNavItemId = 'home-btn-nav'; // Default to home
        }

        sidebarItems.forEach(item => {
            item.classList.remove('active');
            if (item.id === correspondingNavItemId) {
                item.classList.add('active');
            }
        });
    }


    // --- Achievement Popup ---
    function showAchievement(imageSrc) {
        if (!achievementPopup || !achievementImage || !toastSound) {
            console.error("Achievement elements not found.");
            return;
        }
        achievementImage.src = imageSrc;
        achievementPopup.classList.remove('hide');
        achievementPopup.classList.add('show'); // Trigger show animation (CSS handles transform)
        playSound(toastSound);

        // Hide after a delay
        setTimeout(() => {
            achievementPopup.classList.remove('show');
            achievementPopup.classList.add('hide'); // Optionally add hide class if needed for final state
        }, 5000); // Duration achievement is visible
    }

    // --- Particle Effects ---
    function createParticle() {
        if (!particlesEnabled || !particlesContainer || !contentArea) return;
        const particle = document.createElement('div');
        particle.classList.add('particle');
        const x = Math.random() * contentArea.offsetWidth;
        const y = contentArea.offsetHeight; // Start from bottom
        const size = Math.random() * 3 + 2; // Smaller particles: 2px to 5px
        const colorClass = ['white', 'green', 'brown'][Math.floor(Math.random() * 3)];
        const animationDuration = Math.random() * 3 + 4; // Duration: 4s to 7s

        particle.classList.add(colorClass);
        particle.style.left = `${x}px`;
        particle.style.bottom = `-${size}px`; // Position just below the bottom edge
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        // Adjust animation based on new @keyframes
        particle.style.animation = `particles-float ${animationDuration}s linear ${Math.random() * 2}s infinite`; // Add random delay

        particlesContainer.appendChild(particle);

        // Remove particle after its animation cycle (approx) - might need adjustment
        // Or rely on CSS animation iteration count if finite
        setTimeout(() => {
            if (particle.parentNode === particlesContainer) { // Check if still attached
                particle.remove();
            }
        }, (animationDuration + 2) * 1000); // Remove slightly after animation duration + max delay
    }

    function startParticleEffect() {
        if (particlesEnabled && !particleInterval && particlesContainer) {
            // Generate initial burst? Optional.
            particleInterval = setInterval(createParticle, 10); // Create less frequently
        }
    }

    function stopParticleEffect() {
        clearInterval(particleInterval);
        particleInterval = null;
        if (particlesContainer) {
             particlesContainer.innerHTML = ''; // Clear existing particles
        }
    }

    function updateParticleStatusText() {
        if (particlesStatus) {
            particlesStatus.textContent = particlesEnabled ? 'ON' : 'OFF';
        }
    }

    // --- Confirmation Popup ---
    function showCustomConfirmation(message, action) {
        if (!customConfirmationPopup || !overlay || !customConfirmationMessage) return;
        // Set the message and action-specific checkbox text
        customConfirmationMessage.textContent = message;

        const checkboxContainer = customConfirmationPopup.querySelector('.custom-checkbox-container');
        if (action === 'discord' || action === 'youtube' || action === 'github') {
            checkboxContainer.style.display = 'flex';
            dontShowAgainCheckbox.checked = !showRedirectWarning; // Set checkbox based on stored preference
        } else {
            checkboxContainer.style.display = 'none';
            dontShowAgainCheckbox.checked = false;
        }

        pendingAction = action;
        customConfirmationPopup.classList.add('show');
        overlay.classList.add('show');
    }

    function hideCustomConfirmation() {
        if (!customConfirmationPopup || !overlay) return;
        customConfirmationPopup.classList.remove('show');
        overlay.classList.remove('show');
        pendingAction = null;
    }

    // --- Changelog Popup ---
     function showChangelogPopup(versionData) {
         if (!changelogPopup || !overlay || !versionData || !changelogTitleEl) return;

         const statusInfo = statusMap[versionData.status] || { text: 'Unknown', colorClass: '', nameColor: '#eee' };

         // Populate data
         changelogTitleEl.textContent = 'Changelog';
         if (changelogVersionNameEl) {
             changelogVersionNameEl.textContent = versionData.version_name;
             changelogVersionNameEl.className = `changelog-version-name ${statusInfo.colorClass}`; // Apply status class for color
         }
         if (changelogStatusEl) {
             changelogStatusEl.textContent = statusInfo.text;
              changelogStatusEl.className = statusInfo.colorClass; // Apply status class for color
         }
         if (changelogDateEl) changelogDateEl.textContent = versionData.date_released;
         if (changelogTextEl) changelogTextEl.innerHTML = colorCodeText(versionData.changelog); // Use color coded text

         // Show popup and overlay
         changelogPopup.classList.add('show');
         overlay.classList.add('show');
     }

     function hideChangelogPopup() {
         if (!changelogPopup || !overlay) return;
         changelogPopup.classList.remove('show');
         overlay.classList.remove('show');
         isChangelogExpanded = false;
         changelogPopup.classList.remove('expanded');
         if (changelogExpandBtn) {
             changelogExpandBtn.textContent = 'expand'; // Expand icon
         }
     }

     function toggleChangelogExpand() {
         if (!changelogPopup || !changelogExpandBtn) return;
         isChangelogExpanded = !isChangelogExpanded;
         changelogPopup.classList.toggle('expanded', isChangelogExpanded);
         changelogExpandBtn.textContent = isChangelogExpanded ? 'contract' : 'expand';
     }

    // --- Updates Interval Control ---
    function startUpdatesInterval() {
        if (!updatesIntervalId) {
            console.log("Updates fetch interval started.");
        }
    }

    function stopUpdatesInterval() {
        if (updatesIntervalId) {
            clearInterval(updatesIntervalId);
            updatesIntervalId = null;
            console.log("Updates fetch interval stopped.");
        }
    }

    function updateVersionList() {
        const container = document.querySelector(".version-list");
        if (!container) return;

        container.innerHTML = "";
        availableVersions.forEach(version => {
          const div = document.createElement("div");
          div.classList.add("version-box"); // Add class for styling/clicks
          div.innerHTML = `
            <div class="version-name">${version}</div>
            <div class="see-more">See More</div>
          `;

          div.addEventListener("click", () => {
            showChangelog(version);
          });

          container.appendChild(div);
        });
      }

      function showChangelog(version) {
        const changelogWindow = document.querySelector(".changelog-window");
        const changelogContent = document.querySelector(".changelog-content");

        if (!changelogWindow || !changelogContent) return;

        changelogWindow.style.display = "block";
        changelogContent.innerHTML = getChangelogForVersion(version);
      }

      function getChangelogForVersion(version) {
        return `<p><strong>${version}</strong>: Minor updates and improvements.</p>`;
      }
      document.querySelector(".changelog-close").addEventListener("click", () => {
        document.querySelector(".changelog-window").style.display = "none";
      });


    // --- Updates Page Logic ---
    async function fetchAndDisplayUpdates() {
        if (!updatesListContainer || isFetchingUpdates) {
             return;
        }
        isFetchingUpdates = true;
        console.log("Fetching updates data...");
        try {
            const response = await fetch('updates.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            updatesData = await response.json();
            console.log("Updates data fetched:", updatesData);

            // Sort data: status (0>1>2>3), then date (newest first), then version_name (Z-A)
            updatesData.sort((a, b) => {
                 if (a.status !== b.status) {
                     return a.status - b.status; // Sort by status first (0, 1, 2, 3)
                 }
                 // If status is the same, sort by date descending
                 const dateA = new Date(a.date_released);
                 const dateB = new Date(b.date_released);
                 const dateComparison = dateB - dateA;
                 if (dateComparison !== 0) {
                     return dateComparison; // Newest date first
                 }
                 // If dates are the same, sort by version_name descending (Z-A)
                 return b.version_name.localeCompare(a.version_name);
            });

            displayUpdates(updatesData);
        } catch (error) {
            console.error("Failed to fetch or process updates.json:", error);
            updatesListContainer.innerHTML = '<p style="color: red;">Failed to load update information.</p>';
        } finally {
            isFetchingUpdates = false;
        }
    }

    function displayUpdates(data) {
          if (!updatesListContainer) return;
          updatesListContainer.innerHTML = ''; // Clear previous content

          if (!data || data.length === 0) {
              updatesListContainer.innerHTML = '<p>No update information available.</p>';
              return;
          }

          data.forEach(version => {
              const statusInfo = statusMap[version.status] || { text: 'Unknown', colorClass: '' };
              const item = document.createElement('div');
              item.className = `update-item ${statusInfo.colorClass}`; // Add status class for styling
              item.dataset.versionId = version.id; // Store version ID for click event

              item.innerHTML = `
                  <h3 class="update-version-name">${version.version_name}</h3>
                  <p class="update-date">${version.date_released}</p>
                  <button class="update-see-more" data-version-id="${version.id}">See more</button>
              `;
              updatesListContainer.appendChild(item);
          });
    }


    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // --- Prevent Image Dragging ---
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            img.ondragstart = () => false;
        });

        // --- First Click Logic (Load Count & Welcome) ---
        function handleFirstClick() {
            if (!hasIncrementedLoadCount) {
                // Increment Load Count
                let loadCount = localStorage.getItem(loadCountKey);
                loadCount = loadCount ? parseInt(loadCount) : 0;
                loadCount++;
                localStorage.setItem(loadCountKey, loadCount);
                console.log('User Loaded Website Count:', loadCount);
                hasIncrementedLoadCount = true; // Mark as done for this session

                // Show Welcome Achievement
                let welcomeImageSrc = (loadCount > 1)
                    ? 'assets/launcher-achievement_welcome.png'      // Returning user
                    : 'assets/launcher-achievement_welcome_new.png'; // New user
                showAchievement(welcomeImageSrc);
            }
            // Remove the listener after the first interaction
            document.removeEventListener('click', handleFirstClick);
            document.removeEventListener('keydown', handleFirstClick); // Also remove keydown if added
            console.log("First click/keydown listener removed.");
        }
        document.addEventListener('click', handleFirstClick);
         document.addEventListener('keydown', handleFirstClick); // Also trigger on key press


        // --- Sidebar Navigation with Warnings ---
         sidebarItems.forEach(item => {
             item.addEventListener('click', () => {
                 const navItemId = item.id;
                 let targetScreenId = 'home-screen'; // Default
                 let warningMessage = null;

                 if (navItemId === 'home-btn-nav') {
                     targetScreenId = 'home-screen';
                 } else if (navItemId === 'settings-btn-nav') {
                     targetScreenId = 'settings-screen';
                 } else if (navItemId === 'updates-btn-nav') {
                      targetScreenId = 'updates-screen';
                 } else if (navItemId === 'extensions-btn-nav') {
                     warningMessage = `<strong>Warn:</strong> The Extensions page is not released yet! <br><br> <strong>Coming Soon!</strong> <br><br> We're working hard to bring you exciting new ways to extend the launcher's functionality. Stay tuned for updates!`;
                 } else if (navItemId === 'community-btn-nav') {
                     warningMessage = `<strong>Warn:</strong> The Community features are under development. <br><br> <strong>Coming Soon!</strong> <br><br> Connect with other users, share your creations, and participate in discussions. This section is still in progress.`;
                 } else if (navItemId === 'my-extensions-btn-nav') {
                     warningMessage = `<strong>Error:</strong> Access to 'My Extensions' is currently unavailable. <br><br> <strong>Coming Soon!</strong> <br><br> This feature will allow you to manage your installed extensions. We apologize for the inconvenience.`;
                 } else {
                     console.log(`Sidebar item "${navItemId}" clicked, no screen mapping found. Staying on current/defaulting to home.`);
                     targetScreenId = currentActiveScreenId; // Stay or default to home handled by showScreen
                 }

                 if (warningMessage) {
                     playSound(minecraftClickSound);
                     showCustomConfirmation(warningMessage, 'warning'); // Use a generic action type
                 } else {
                     showScreen(targetScreenId);
                     playSound(sidebarClickSound); // Play sound only if no warning
                 }
             });
         });


        // --- Particle Toggle ---
        if (particlesToggle) {
            particlesToggle.addEventListener('click', () => {
                particlesEnabled = !particlesEnabled;
                updateParticleStatusText();
                playSound(sidebarClickSound); // Use sidebar sound
                if (particlesEnabled) {
                    startParticleEffect();
                } else {
                    stopParticleEffect();
                }
            });
        }

        // --- Visibility Change (Pause Particles) ---
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopParticleEffect();
            } else if (particlesEnabled) { // Resume only if they were enabled
                startParticleEffect();
            }
        });

        // --- Social Buttons (Homepage) ---
        if (discordButtonHome) discordButtonHome.addEventListener('click', () => {
            playSound(minecraftClickSound);
            showCustomConfirmation('You are about to be redirected to Discord.', 'discord');
        });
        if (youtubeButtonHome) youtubeButtonHome.addEventListener('click', () => {
            playSound(minecraftClickSound);
            showCustomConfirmation('You are about to be redirected to YouTube.', 'youtube');
        });
        if (githubButtonHome) githubButtonHome.addEventListener('click', () => {
            playSound(minecraftClickSound);
            showCustomConfirmation('You are about to be redirected to GitHub.', 'github');
        });
        if (downloadButtonHome) downloadButtonHome.addEventListener('click', () => {
            playSound(minecraftClickSound);
            downloadUI.style.display = 'block'; // Show the download UI
        });

        // --- Start Download Button ---
        if (startDownloadButton) startDownloadButton.addEventListener('click', () => {
            playSound(minecraftClickSound);
            // Trigger the download
            window.location.href = 'file:///C:/Users/user/Downloads/Mod%20Launcher.zip';
            // Optionally, you could provide feedback to the user
            startDownloadButton.textContent = 'Downloading...';
            setTimeout(() => {
                startDownloadButton.textContent = 'Download Complete';
                setTimeout(() => {
                    startDownloadButton.textContent = 'Click to Download';
                    downloadUI.style.display = 'none'; // Hide UI after some time
                }, 3000);
            }, 2000);
        });

         // --- Settings Buttons (Confirmation) ---
         if (resetDataBtn) resetDataBtn.addEventListener('click', () => {
             playSound(minecraftClickSound);
             showCustomConfirmation(
                 "You about to reset your personal site data. Confirm? (this setting will reset your data that was saved here, you will be logged out on refresh!)",
                 'reset'
             );
         });
         if (clearCacheBtn) clearCacheBtn.addEventListener('click', () => {
             playSound(minecraftClickSound);
             showCustomConfirmation(
                 "You about to clear cache. Confirm? (this setting does not affect you stuff!)",
                 'clear'
             );
         });

        // --- Confirmation Popup Buttons ---
        if (customCancelButton) customCancelButton.addEventListener('click', () => {
            playSound(minecraftClickSound);
            hideCustomConfirmation();
        });

        if (customConfirmButton) customConfirmButton.addEventListener('click', () => {
            playSound(minecraftClickSound);
            const action = pendingAction;

            if (action === 'discord' || action === 'youtube' || action === 'github') {
                if (dontShowAgainCheckbox.checked) {
                    localStorage.setItem(dontShowAgainKey, 'true');
                    showRedirectWarning = false;
                }
            }

            hideCustomConfirmation(); // Hide popup after handling 'don't show again'

            // Perform confirmed action
            switch (action) {
                case 'discord':
                    window.open('https://discord.gg/KjEZtRmWwc', '_blank');
                    setTimeout(() => showAchievement('assets/launcher-achievement_support.png'), 500);
                    break;
                case 'youtube':
                    window.open('https://www.youtube.com/@toxic5018.2', '_blank'); // Use corrected URL
                     setTimeout(() => showAchievement('assets/launcher-achievement_support.png'), 500);
                    break;
                case 'github':
                    window.open('https://github.com/', '_blank');
                     setTimeout(() => showAchievement('assets/launcher-achievement_support.png'), 500);
                    break;
                case 'reset':
                    console.log(`Resetting data: Removing localStorage key '${loadCountKey}'.`);
                    localStorage.removeItem(loadCountKey);
                    window.location.reload();
                    break;
                 case 'clear':
                     console.log("Reloading tab without clearing localStorage data.");
                     window.location.reload();
                     break;

                default:
                    console.warn(`Unknown confirmation action: ${action}`);
            }
        });

        // --- Footer Popup Toggle (Scroll Arrow) ---
        if (scrollDownArrow && footerPopup && scrollDownArrowIcon && drawerOpenSound && drawerCloseSound) {
            scrollDownArrow.addEventListener('click', (e) => {
                e.stopPropagation();
                footerPopupVisible = !footerPopupVisible;
                footerPopup.classList.toggle('show', footerPopupVisible);
                scrollDownArrow.classList.toggle('show-popup', footerPopupVisible); // Adjust arrow position

                if (footerPopupVisible) {
                    playSound(drawerOpenSound);
                    scrollDownArrowIcon.textContent = 'expand_more'; // Change to down arrow when open (icon is arrow body)
                     scrollDownArrowIcon.style.transform = 'rotate(180deg)'; // Rotate arrow up
                } else {
                    playSound(drawerCloseSound);
                     scrollDownArrowIcon.style.transform = 'rotate(0deg)'; // Reset rotation
                    // scrollDownArrowIcon.textContent = 'expand_more'; // Keep icon, just change rotation
                }
            });
        }

        // --- Close Footer Popup on Outside Click ---
        document.addEventListener('click', (event) => {
            if (footerPopupVisible && footerPopup && scrollDownArrow) {
                if (!footerPopup.contains(event.target) && !scrollDownArrow.contains(event.target)) {
                    footerPopupVisible = false;
                    footerPopup.classList.remove('show');
                    scrollDownArrow.classList.remove('show-popup');
                     if(scrollDownArrowIcon) scrollDownArrowIcon.style.transform = 'rotate(0deg)'; // Reset arrow
                    playSound(drawerCloseSound);
                }
            }
        });

         // --- Footer Popup Updates Button ---
         if (footerUpdatesButton) {
             footerUpdatesButton.addEventListener('click', () => {
                 showScreen('updates-screen');
                 // Optionally close the footer popup after clicking
                 if (footerPopupVisible && footerPopup && scrollDownArrow) {
                     footerPopupVisible = false;
                     footerPopup.classList.remove('show');
                     scrollDownArrow.classList.remove('show-popup');
                      if(scrollDownArrowIcon) scrollDownArrowIcon.style.transform = 'rotate(0deg)';
                     playSound(drawerCloseSound); // Play close sound
                 }
             });
         }

         // --- Updates List "See More" Button (Event Delegation) ---
         if (updatesListContainer) {
             updatesListContainer.addEventListener('click', (event) => {
                 const target = event.target;
                 const updateItem = target.closest('.update-item');

                 if (updateItem) {
                     const versionId = updateItem.dataset.versionId;
                     console.log(`Version box clicked for version ID: ${versionId}`);
                      if (updatesData && versionId) {
                          const versionData = updatesData.find(v => v.id === versionId);
                          if (versionData) {
                                  showChangelogPopup(versionData);
                          } else {
                              console.error(`Version data not found for ID: ${versionId}`);
                          }
                      } else {
                          console.error("Updates data not loaded or version ID missing.");
                      }
                 }
             });
         }

         // --- Changelog Popup Close Button ---
          if (changelogCloseBtn) {
              changelogCloseBtn.addEventListener('click', hideChangelogPopup);
          }

          // --- Changelog Popup Expand Button ---
          if (changelogExpandBtn) {
              changelogExpandBtn.addEventListener('click', toggleChangelogExpand);
          }

          // --- Close Popups with Escape Key ---
          document.addEventListener('keydown', (event) => {
              if (event.key === 'Escape') {
                  if (customConfirmationPopup && customConfirmationPopup.classList.contains('show')) {
                      hideCustomConfirmation();
                  } else if (changelogPopup && changelogPopup.classList.contains('show')) {
                      hideChangelogPopup();
                  }
                  // Add else if for other popups if needed
              }
          });

          // --- Credits Button Icon - REMOVED ---
          if (creditsButton) {
              creditsButton.innerHTML = `Credits`;
          }

          // --- Taskbar Mode Toggle (Example - could be a button or setting) ---
          // For demonstration, let's toggle taskbar mode when 'T' key is pressed
          document.addEventListener('keydown', (event) => {
              if (event.key.toLowerCase() === 't') {
                  isTaskbarMode = !isTaskbarMode;
                  launcher.classList.toggle('taskbar-mode', isTaskbarMode);
                  console.log("Taskbar Mode:", isTaskbarMode);
              }
          });

          const tabButtons = document.querySelectorAll(".tab-button");

          tabButtons.forEach(button => {
              button.addEventListener("click", () => {
                  updateVersionList(); // Call only when switching tabs
              });
          });

          window.addEventListener("load", () => {
              updateVersionList(); // Call once on tab reload
          });

    } // End of setupEventListeners

    // --- Run Initialization ---
    initialize();

}); // End of DOMContentLoaded