<script lang="ts">
	import { page } from '$app/stores';
	import { ChevronLeft, ChevronRight, Home, Wallet, User } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import ExperienceSection from '$lib/portal/experience-section.svelte';

	let isExpanded = $state(true);

	function toggleSidebar() {
		isExpanded = !isExpanded;
	}

	// Derive active tab from current route
	let activeTab = $derived.by(() => {
		const path = $page.url.pathname;
		if (path.includes('/wallet')) return 'wallet';
		if (path.includes('/profile')) return 'profile';
		return 'home';
	});
</script>

<div class="min-h-screen bg-gray-900">
	<!-- Sidebar -->
	<div
		class="fixed left-0 top-0 h-full bg-black/95 border-r-2 border-purple-600/50 backdrop-blur-md z-50 flex flex-col transition-none"
		style="width: {isExpanded ? '20rem' : '4rem'}; transition: width 150ms steps(8);"
	>
		<!-- Toggle Button -->
		<button
			onclick={toggleSidebar}
			class="absolute -right-4 top-6 bg-purple-600/80 hover:bg-purple-600 text-white rounded-full p-1.5 transition-colors duration-200 shadow-lg"
		>
			{#if isExpanded}
				<ChevronLeft class="w-4 h-4" />
			{:else}
				<ChevronRight class="w-4 h-4" />
			{/if}
		</button>

		<!-- Experience Section -->
		<div class="p-4 overflow-hidden" style="opacity: {isExpanded ? 1 : 0}; transition: opacity 150ms steps(4);">
			<ExperienceSection />
		</div>

		{#if isExpanded}

			<!-- Navigation Buttons -->
			<div class="flex-1 px-4 pb-4 space-y-2">
				<Button
					href="/portal"
					class="flex items-center gap-3 w-full px-4 py-2 rounded-md text-white transition-colors {activeTab === 'home' ? 'bg-purple-600 hover:bg-purple-700' : 'hover:bg-gray-800'}"
				>
					<Home class="w-5 h-5" />
					<span>Home</span>
			</Button>

			<Button
			href="/portal/wallet"
					class="flex items-center gap-3 w-full px-4 py-2 rounded-md text-white transition-colors {activeTab === 'wallet' ? 'bg-purple-600 hover:bg-purple-700' : 'hover:bg-gray-800'}"
				>
					<Wallet class="w-5 h-5" />
					<span>Wallet</span>
				</Button>

				<Button
					href="/portal/profile"
					class="flex items-center gap-3 w-full px-4 py-2 rounded-md text-white transition-colors {activeTab === 'profile' ? 'bg-purple-600 hover:bg-purple-700' : 'hover:bg-gray-800'}"
				>
					<User class="w-5 h-5" />
					<span>Profile</span>
				</Button>
			</div>
		{:else}
			<!-- Collapsed state - just icons -->
			<div class="flex-1 px-2 py-4 space-y-2">
				<Button
					class="w-full h-10 p-0"
					href="/portal"
				>
					<Home class="w-5 h-5" />
				</Button>

				<Button
					class="w-full h-10 p-0"
					href="/portal/wallet"
				>
					<Wallet class="w-5 h-5" />
				</Button>

				<Button
					class="w-full h-10 p-0"
					href="/portal/profile"
				>
					<User class="w-5 h-5" />
				</Button>
			</div>
		{/if}
	</div>

	<!-- Main Content Area -->
	<div class="transition-none" id="main-content" style="padding-left: {isExpanded ? '20rem' : '4rem'}; transition: padding-left 150ms steps(8);">
		<slot />
	</div>
</div>

<style>
</style>