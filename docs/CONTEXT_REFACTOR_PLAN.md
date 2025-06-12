# 🔄 Context Management Refactor Plan

## 🎯 **Goal: DRY, Organized, Unified, Modular Context Management**

### **Current Problems**
- ❌ Multiple overlapping authentication contexts
- ❌ Scattered user state management  
- ❌ Redundant environment detection logic
- ❌ Complex provider nesting (7 levels deep)
- ❌ No single source of truth

### **Proposed Solution: Unified App Context**
- ✅ Single context for all app state
- ✅ Reducer-based state management
- ✅ Centralized environment detection
- ✅ Unified authentication flow
- ✅ Clean separation of concerns

## 📋 **Migration Steps**

### **Phase 1: Create Unified Context** ✅
- [x] `contexts/unified-app-context.tsx` - Single source of truth
- [x] Reducer-based state management
- [x] Centralized environment detection
- [x] Unified user authentication

### **Phase 2: Simplify Providers**
```tsx
// BEFORE (7 nested providers)
<ErudaProvider>
  <NeynarContextProvider>
    <AppModeProvider>
      <QueryProvider>
        <WagmiProvider>
          <MiniKitProvider>
            <MiniAppProvider>

// AFTER (4 essential providers)
<ErudaProvider>
  <QueryProvider>
    <WagmiProvider>
      <NeynarContextProvider>
        <MiniKitProvider>
          <UnifiedAppProvider>
```

### **Phase 3: Replace Existing Hooks**
```tsx
// BEFORE - Multiple hooks for same data
const { mode } = useAppMode();
const { user } = useSimpleUser();
const { isConnected } = useAccount();
const { user: neynarUser } = useNeynarContext();

// AFTER - Single unified hook
const { 
  environment: { mode },
  user,
  isWalletConnected,
  isFarcasterUser 
} = useUnifiedApp();
```

### **Phase 4: Update Components**
- Replace `useSimpleUser` → `useAppUser`
- Replace `useAppMode` → `useAppEnvironment`  
- Remove `WarpcastWallet` wrapper logic
- Simplify `AuthFlow` component

### **Phase 5: Remove Deprecated Code**
- Delete `contexts/app-mode-context.tsx`
- Delete `hooks/use-simple-user.ts`
- Delete `contexts/miniapp-context.tsx` (merge into unified)
- Clean up component-specific auth state

## 🏗️ **New Architecture Benefits**

### **1. Single Source of Truth**
```tsx
interface AppState {
  environment: AppEnvironment;    // Mode, capabilities, device info
  user: User | null;             // Unified user data
  isAuthenticated: boolean;      // Clear auth state
  isWalletConnected: boolean;    // Wallet connection
  error: string | null;          // Global error state
}
```

### **2. Predictable State Updates**
```tsx
// All state changes go through reducer
dispatch({ type: "SET_USER", payload: user });
dispatch({ type: "SET_ENVIRONMENT", payload: env });
dispatch({ type: "SET_ERROR", payload: error });
```

### **3. Clean Component Usage**
```tsx
function MyComponent() {
  const { 
    user, 
    isAuthenticated, 
    showMiniAppFeatures,
    setError 
  } = useUnifiedApp();
  
  // Simple, predictable state access
}
```

### **4. Modular Hooks**
```tsx
// Use only what you need
const { mode, isFarcasterEnvironment } = useAppEnvironment();
const { user, isFarcasterUser } = useAppUser();
const { isWalletConnected, walletAddress } = useAppWallet();
```

## 🔧 **Implementation Strategy**

### **Option A: Gradual Migration (Recommended)**
1. Add `UnifiedAppProvider` alongside existing contexts
2. Migrate components one by one
3. Remove old contexts when no longer used
4. Zero breaking changes during transition

### **Option B: Complete Replacement**
1. Replace all contexts at once
2. Update all components simultaneously  
3. Faster but higher risk

## 📊 **Before vs After Comparison**

### **Lines of Code**
- **Before**: ~800 lines across 4 context files
- **After**: ~300 lines in 1 unified context
- **Reduction**: 62% less code

### **Provider Nesting**
- **Before**: 7 levels deep
- **After**: 4 levels deep  
- **Reduction**: 43% less nesting

### **Hook Complexity**
- **Before**: 8 different hooks for user/auth state
- **After**: 3 focused hooks
- **Reduction**: 62% fewer hooks

## 🚀 **Next Steps**

1. **Review** this unified context approach
2. **Test** with existing components
3. **Migrate** one component at a time
4. **Remove** deprecated contexts
5. **Document** new patterns

## 🎯 **Success Metrics**

- ✅ Single source of truth for all app state
- ✅ No duplicate authentication logic
- ✅ Simplified component code
- ✅ Better TypeScript inference
- ✅ Easier testing and debugging
- ✅ Consistent state management patterns

Would you like to proceed with this unified approach?
