'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { LogicError, LogicErrorType, ErrorSeverity } from '@/types/analysis';
import { FilterCriteria } from '@/types/visualization';
import { X, Search, Filter, RotateCcw, Save, Trash2 } from 'lucide-react';

interface AdvancedFilterProps {
  errors: LogicError[];
  onFilterChange: (filteredErrors: LogicError[]) => void;
  onCriteriaChange?: (criteria: FilterCriteria) => void;
  savedFilters?: SavedFilter[];
  onSaveFilter?: (filter: SavedFilter) => void;
  onDeleteFilter?: (id: string) => void;
}

interface SavedFilter {
  id: string;
  name: string;
  criteria: FilterCriteria;
  createdAt: Date;
}

const ERROR_TYPES: LogicErrorType[] = ['timeline', 'character', 'plot', 'dialogue', 'scene'];
const ERROR_SEVERITIES: ErrorSeverity[] = ['critical', 'high', 'medium', 'low'];

export const AdvancedFilter = React.memo<AdvancedFilterProps>(({
  errors,
  onFilterChange,
  onCriteriaChange,
  savedFilters = [],
  onSaveFilter,
  onDeleteFilter
}) => {
  const [criteria, setCriteria] = useState<FilterCriteria>({
    types: [],
    severities: [],
    scenes: [],
    characters: [],
    searchText: ''
  });
  const [filterName, setFilterName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const availableScenes = useMemo(() => {
    const scenes = new Set<number>();
    errors.forEach(error => {
      if (error.location.sceneNumber) {
        scenes.add(error.location.sceneNumber);
      }
    });
    return Array.from(scenes).sort((a, b) => a - b);
  }, [errors]);

  const availableCharacters = useMemo(() => {
    const characters = new Set<string>();
    errors.forEach(error => {
      if (error.location.characterName) {
        characters.add(error.location.characterName);
      }
    });
    return Array.from(characters).sort();
  }, [errors]);

  const applyFilter = useCallback(() => {
    let filtered = [...errors];
    
    if (criteria.types && criteria.types.length > 0) {
      filtered = filtered.filter(error => criteria.types!.includes(error.type));
    }
    
    if (criteria.severities && criteria.severities.length > 0) {
      filtered = filtered.filter(error => criteria.severities!.includes(error.severity));
    }
    
    if (criteria.scenes && criteria.scenes.length > 0) {
      filtered = filtered.filter(error => 
        error.location.sceneNumber && criteria.scenes!.includes(error.location.sceneNumber)
      );
    }
    
    if (criteria.characters && criteria.characters.length > 0) {
      filtered = filtered.filter(error =>
        error.location.characterName && criteria.characters!.includes(error.location.characterName)
      );
    }
    
    if (criteria.searchText) {
      const searchLower = criteria.searchText.toLowerCase();
      filtered = filtered.filter(error =>
        error.description.toLowerCase().includes(searchLower) ||
        error.suggestion?.toLowerCase().includes(searchLower) ||
        error.context?.toLowerCase().includes(searchLower)
      );
    }
    
    onFilterChange(filtered);
  }, [errors, criteria, onFilterChange]);

  useEffect(() => {
    applyFilter();
    onCriteriaChange?.(criteria);
  }, [criteria, applyFilter, onCriteriaChange]);

  const handleToggleType = (type: LogicErrorType) => {
    setCriteria(prev => ({
      ...prev,
      types: prev.types?.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...(prev.types || []), type]
    }));
  };

  const handleToggleSeverity = (severity: ErrorSeverity) => {
    setCriteria(prev => ({
      ...prev,
      severities: prev.severities?.includes(severity)
        ? prev.severities.filter(s => s !== severity)
        : [...(prev.severities || []), severity]
    }));
  };

  const handleToggleScene = (scene: number) => {
    setCriteria(prev => ({
      ...prev,
      scenes: prev.scenes?.includes(scene)
        ? prev.scenes.filter(s => s !== scene)
        : [...(prev.scenes || []), scene]
    }));
  };

  const handleToggleCharacter = (character: string) => {
    setCriteria(prev => ({
      ...prev,
      characters: prev.characters?.includes(character)
        ? prev.characters.filter(c => c !== character)
        : [...(prev.characters || []), character]
    }));
  };

  const handleReset = () => {
    setCriteria({
      types: [],
      severities: [],
      scenes: [],
      characters: [],
      searchText: ''
    });
  };

  const handleSaveFilter = () => {
    if (filterName && onSaveFilter) {
      onSaveFilter({
        id: Date.now().toString(),
        name: filterName,
        criteria: { ...criteria },
        createdAt: new Date()
      });
      setFilterName('');
    }
  };

  const handleLoadFilter = (filter: SavedFilter) => {
    setCriteria(filter.criteria);
  };

  const activeFiltersCount = 
    (criteria.types?.length || 0) +
    (criteria.severities?.length || 0) +
    (criteria.scenes?.length || 0) +
    (criteria.characters?.length || 0) +
    (criteria.searchText ? 1 : 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={20} />
            <span>Advanced Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount} active</Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleReset}
              disabled={activeFiltersCount === 0}
            >
              <RotateCcw size={16} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <Input
            type="text"
            placeholder="Search errors..."
            value={criteria.searchText || ''}
            onChange={(e) => setCriteria(prev => ({ ...prev, searchText: e.target.value }))}
            className="pl-9"
          />
        </div>
        
        {isExpanded && (
          <>
            <div>
              <Label className="text-sm font-medium mb-2 block">Error Types</Label>
              <div className="flex flex-wrap gap-2">
                {ERROR_TYPES.map(type => (
                  <Badge
                    key={type}
                    variant={criteria.types?.includes(type) ? 'default' : 'outline'}
                    className="cursor-pointer capitalize"
                    onClick={() => handleToggleType(type)}
                  >
                    {type}
                    {criteria.types?.includes(type) && (
                      <X size={12} className="ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">Severity Levels</Label>
              <div className="flex flex-wrap gap-2">
                {ERROR_SEVERITIES.map(severity => (
                  <Badge
                    key={severity}
                    variant={criteria.severities?.includes(severity) ? 'default' : 'outline'}
                    className="cursor-pointer capitalize"
                    onClick={() => handleToggleSeverity(severity)}
                  >
                    {severity}
                    {criteria.severities?.includes(severity) && (
                      <X size={12} className="ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
            
            {availableScenes.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Scenes</Label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                  {availableScenes.map(scene => (
                    <Badge
                      key={scene}
                      variant={criteria.scenes?.includes(scene) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => handleToggleScene(scene)}
                    >
                      Scene {scene}
                      {criteria.scenes?.includes(scene) && (
                        <X size={12} className="ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {availableCharacters.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Characters</Label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                  {availableCharacters.map(character => (
                    <Badge
                      key={character}
                      variant={criteria.characters?.includes(character) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => handleToggleCharacter(character)}
                    >
                      {character}
                      {criteria.characters?.includes(character) && (
                        <X size={12} className="ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {onSaveFilter && (
              <div className="border-t pt-4">
                <div className="flex gap-2 mb-3">
                  <Input
                    type="text"
                    placeholder="Filter name..."
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveFilter}
                    disabled={!filterName || activeFiltersCount === 0}
                  >
                    <Save size={16} className="mr-1" />
                    Save
                  </Button>
                </div>
                
                {savedFilters.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Saved Filters</Label>
                    <div className="space-y-1">
                      {savedFilters.map(filter => (
                        <div
                          key={filter.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
                        >
                          <button
                            className="flex-1 text-left text-sm"
                            onClick={() => handleLoadFilter(filter)}
                          >
                            {filter.name}
                          </button>
                          {onDeleteFilter && (
                            <button
                              onClick={() => onDeleteFilter(filter.id)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        
        <div className="text-sm text-gray-600">
          Showing {errors.length} errors
        </div>
      </CardContent>
    </Card>
  );
});

AdvancedFilter.displayName = 'AdvancedFilter';