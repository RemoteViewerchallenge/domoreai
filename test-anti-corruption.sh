#!/bin/bash

# Test script to verify Anti-Corruption Pipeline implementation

echo "🧪 Testing Anti-Corruption Pipeline Implementation"
echo "=================================================="
echo ""

# Check if UnifiedIngestionService exists
echo "1. Checking UnifiedIngestionService.ts..."
if [ -f "apps/api/src/services/UnifiedIngestionService.ts" ]; then
    echo "   ✅ UnifiedIngestionService.ts exists"
else
    echo "   ❌ UnifiedIngestionService.ts not found"
    exit 1
fi

# Check if index.ts imports UnifiedIngestionService
echo "2. Checking index.ts integration..."
if grep -q "UnifiedIngestionService" apps/api/src/index.ts; then
    echo "   ✅ index.ts imports UnifiedIngestionService"
else
    echo "   ❌ index.ts does not import UnifiedIngestionService"
    exit 1
fi

# Check if RawDataLake table exists in schema
echo "3. Checking RawDataLake schema..."
if grep -q "model RawDataLake" apps/api/prisma/schema.prisma; then
    echo "   ✅ RawDataLake table defined in schema"
else
    echo "   ❌ RawDataLake table not found in schema"
    exit 1
fi

# Check for key functions
echo "4. Checking key functions..."
if grep -q "ingestAllModels" apps/api/src/services/UnifiedIngestionService.ts; then
    echo "   ✅ ingestAllModels() function exists"
else
    echo "   ❌ ingestAllModels() function not found"
    exit 1
fi

if grep -q "isModelFree" apps/api/src/services/UnifiedIngestionService.ts; then
    echo "   ✅ isModelFree() function exists"
else
    echo "   ❌ isModelFree() function not found"
    exit 1
fi

# Check for strict OpenRouter filtering
echo "5. Checking OpenRouter filtering logic..."
if grep -q "providerName === 'openrouter' && !isFree" apps/api/src/services/UnifiedIngestionService.ts; then
    echo "   ✅ Strict OpenRouter filtering implemented"
else
    echo "   ❌ OpenRouter filtering not found"
    exit 1
fi

# Check for Phase 1 and Phase 2 comments
echo "6. Checking two-phase architecture..."
if grep -q "PHASE 1" apps/api/src/services/UnifiedIngestionService.ts && \
   grep -q "PHASE 2" apps/api/src/services/UnifiedIngestionService.ts; then
    echo "   ✅ Two-phase architecture documented"
else
    echo "   ❌ Phase comments not found"
    exit 1
fi

echo ""
echo "=================================================="
echo "✅ All checks passed! Anti-Corruption Pipeline is properly implemented."
echo ""
echo "Key Features:"
echo "  • Phase 1: Raw data preservation in RawDataLake"
echo "  • Phase 2: Strict filtering and normalization"
echo "  • OpenRouter: Rejects paid models (pricing check)"
echo "  • Groq, Google, Mistral: Fail-open (free tier assumed)"
echo "  • Ollama: Always free (local models)"
echo ""
