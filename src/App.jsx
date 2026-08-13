import { BrandHeader } from './components/brand'
import { Sidebar, Toast, ViewTabs } from './components/layout'
import { ProfileModal } from './components/profile'
import { CreateSajuForm, SavedSajuView } from './components/saju'
import { useSajuApp } from './hooks/useSajuApp'
import { trackEvent } from './lib/analytics'
import './App.css'

function App() {
  const saju = useSajuApp()

  return (
    <div className={saju.layoutClass}>
      <Sidebar
        authReady={saju.authReady}
        user={saju.user}
        profile={saju.profile}
        authBusy={saju.authBusy}
        profileModal={saju.profileModal}
        onEditProfile={() => saju.openProfileModal('edit')}
        onLogout={saju.handleLogout}
        onLogin={() => saju.handleGoogleLogin('sidebar')}
        onNewSaju={saju.handleNewSajuClick}
        readingsError={saju.readingsError}
        otherPeople={saju.otherPeople}
        selectedUserId={saju.selectedUserId}
        viewMode={saju.viewMode}
        onSelectPerson={(person) => {
          trackEvent('select_saved_person')
          saju.applySajuUser(person)
        }}
        onDeletePerson={saju.handleDeleteSajuUser}
        onRefresh={() => saju.loadSajuUsers(saju.user)}
      />

      <div className="app">
        <BrandHeader
          loading={saju.loading}
          readingCount={saju.readingCount}
          tagline="사주? 내 전문이지. 돌려 말하지 않는다."
          loadingTagline="식빵이 익는 동안 명식을 세운다."
        />

        <ViewTabs
          viewMode={saju.viewMode}
          profile={saju.profile}
          onSelectProfile={() => {
            if (saju.profile) {
              trackEvent('select_my_saju')
              saju.applySajuUser(saju.profile)
            }
          }}
          onNewSaju={saju.handleNewSajuClick}
        />

        {saju.isSavedView ? (
          <SavedSajuView
            viewMode={saju.viewMode}
            name={saju.name}
            birthDate={saju.birthDate}
            birthTime={saju.birthTime}
            gender={saju.gender}
            calendarType={saju.calendarType}
            isViewingProfile={saju.isViewingProfile}
            loading={saju.loading}
            error={saju.error}
            canShareResult={saju.canShareResult}
            selectedId={saju.selectedId}
            resultRevealKey={saju.resultRevealKey}
            summary={saju.summary}
            result={saju.result}
            todayFortune={saju.todayFortune}
            showBlessing={saju.showBlessing}
            resultBlockRef={saju.resultBlockRef}
            resultLocked={saju.resultLocked}
            onLogin={() => saju.handleGoogleLogin('result_lock')}
            authBusy={saju.authBusy}
            loginDisabled={saju.loginDisabled}
            onAnalyze={saju.handleAnalyze}
            onEditProfile={() => saju.openProfileModal('edit')}
            onEditReading={saju.startEditReading}
            onDelete={saju.deleteSelectedUser}
            onToast={saju.showToast}
            user={saju.user}
          />
        ) : (
          <CreateSajuForm
            viewMode={saju.viewMode}
            values={saju.formValues}
            onFieldChange={saju.handleFieldChange}
            birthOptions={saju.birthOptions}
            name={saju.name}
            loading={saju.loading}
            error={saju.error}
            onSubmit={saju.handleAnalyze}
            resultRevealKey={saju.resultRevealKey}
            summary={saju.summary}
            result={saju.result}
            todayFortune={saju.todayFortune}
            showBlessing={saju.showBlessing}
            resultBlockRef={saju.resultBlockRef}
            resultLocked={saju.resultLocked}
            onLogin={() => saju.handleGoogleLogin('result_lock')}
            authBusy={saju.authBusy}
            loginDisabled={saju.loginDisabled}
            canShareResult={saju.canShareResult}
            selectedId={saju.selectedId}
            onToast={saju.showToast}
          />
        )}
      </div>

      {saju.profileModal ? (
        <ProfileModal
          key={saju.profileModal}
          mode={saju.profileModal}
          initialValues={saju.profileModalValues}
          years={saju.birthOptions.years}
          months={saju.birthOptions.months}
          days={saju.birthOptions.days}
          hours={saju.birthOptions.hours}
          minutes={saju.birthOptions.minutes}
          saving={saju.profileSaving}
          error={saju.profileError}
          onSubmit={saju.handleSaveProfile}
          onCancel={saju.profileModal === 'edit' ? saju.closeProfileModal : undefined}
          onLogout={saju.profileModal === 'onboard' ? saju.handleLogout : undefined}
        />
      ) : null}

      <Toast toast={saju.toast} />
    </div>
  )
}

export default App
